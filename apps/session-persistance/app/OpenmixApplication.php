<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    private $platforms = array(
        'amazon_ec2___eu_west_1a' => 'aws-euwest.cedexis.com',
        'amazon_ec2___us_east_1a' => 'aws-useast.cedexis.com',
        'amazon_ec2___us_west__or__2a' => 'aws-uswestor.cedexis.com',
        'amazon_ec2___asia_ne__tokyo__1a' => 'aws-apjp.cedexis.com',
        'amazon_ec2___asia_se__singapore__1a' => 'aws-apsin.cedexis.com',
    );


    private $ttl = 20;
    // Sonar
    private $sonarThreshold = 95;
    //Radar
    private $availabilityThreshold = 85;
    // Options within 25% will be considered a tie
    // and chosen based on a consistent hashing algorithm
    private $rtt_variance = .75;
    // allows varying routing behavior when sharing target pools between apps
    private $identifier = 0;
    // lower - faster script execution, higher - more even distribution
    // 20 appears to be a good starting point
    private $replicas = 20;

    
    private $reasons = array(
        'Best performing platform selected by RTT' => 'A',
        'Hash routing' => 'B',
        'Data Problem' => 'C',
        'All platforms eliminated' => 'D'
     );

    // For use in the hash lookup
    private $target_buckets = array();
    private $sorted_hashes = array();

    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(PulseProperties::SONAR, implode(',', array_keys($this->platforms)));
        $config->declareInput(RadarProbeTypes::AVAILABILITY, implode(',', array_keys($this->platforms)));
        $config->declareInput(RadarProbeTypes::HTTP_RTT, implode(',', array_keys($this->platforms)));
        $config->declareInput(GeoProperties::ASN);
        $config->declareInput(EDNSProperties::ASN);

        foreach ($this->platforms as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }

        foreach ($this->reasons as $code)
        {
            $config->declareReasonCode($code);
        }
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        //First, remove unavailable platforms
        $sonar = $request->pulse(PulseProperties::SONAR);
        $avail = $request->radar(RadarProbeTypes::AVAILABILITY);

        $candidates = $this->platforms;

        if (is_array($sonar) || is_array($avail)) {
            // Sonar or Avail data is available, so loop through all candidates and
            // remove any that don't meet the Sonar or the Avail threshold
            foreach (array_keys($candidates) as $akey) {
                if ((isset($sonar[$akey]) 
                     && $sonar[$akey] <= $this->sonarThreshold) 
                     || (isset($avail[$akey]) && $avail[$akey] < $this->availabilityThreshold)) {
                    unset($candidates[$akey]);
                }
            }
        }

        //If none or just one are available, choose the least bad
        if(count($candidates) <= 1)
        {
            //print "Availability Issue\n";
            arsort($avail);
            $response->selectProvider(key($avail));
            $response->setReasonCode($this->reasons['All platforms eliminated']);
            // Stop further execution
            return;
        }
        
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        $targets = array();
        if (is_array($rtt) && 0 < count($rtt)) 
        {
            $candidates = array_intersect_key($rtt, $candidates);

            asort($candidates);
            //print_r($candidates);
            // Get the score of the fastest
            $best_score = $candidates[key($candidates)];
            
            // Calculate which platforms are ties
            
            foreach ($candidates as $alias => $score)
            {
                if ($score * $this->rtt_variance < $best_score)
                {
                    //add to targets
                    array_push($targets, $alias);
                }
            }
            if(count($targets) == 1)
            {
                //print "Clear winner \n";
                $response->selectProvider($targets[0]);
                $response->setReasonCode($this->reasons['Best performing platform selected by RTT']);
                return;
            } 
        } else
        {
            // in the rare case we don't have RTT data
            // choose consistently from among all candidates
            $targets = array_keys($candidates);
        }

        /** There was a tie of at least 2
         * So we choose using the consistent hashing algorithm
         * This should ensure we make the same choice each time
         * for each ASN seen
         * */
        foreach ($targets as $target)
        {
            $this->add_target($target);
        }
        
        //print_r($targets);
        
        // Compare the hash of the reqestor key to the hash ring based on the platforms
        $index = $this->search($request);
        //print "index: $index\n";
        
        //print_r($this->target_buckets);
        //print "$this->sorted_hashes[$index]\n";
        
        //print_r($this->target_buckets[$this->sorted_hashes[$index]]);
        
        $response->selectProvider($this->target_buckets[$this->sorted_hashes[$index]]);
        $response->setReasonCode($this->reasons['Hash routing']);
        return;

    }
    /**
     * Get an index in the sorted hash list
     * @param Request $request
     */
    private function search($request)
    {
        //$key = $this->get_key($request);
        //print "key: $key\n";
        $hash = crc32($this->get_key($request));
        $left = 0;
        $right = count($this->sorted_hashes) - 1;

        while ($left < $right)
        {
            $mid = ($right + $left) >> 1;

            if ($this->sorted_hashes[$mid] < $hash)
            {
                $left = $mid + 1;
            }
            else
            {
                $right = $mid;
            }
        }
        return $left;
    }

    /**
     * Get a key for a user segment
     * @param Request $request;
     */
    public function get_key($request)
    {
        if ($request->geo(EDNSProperties::ENABLE))
        {
            $asn = $request->geo(EDNSProperties::ASN);
        }
        else
        {
            $asn = $request->geo(GeoProperties::ASN);
        }

        //return "$market-$country-$asn";
        return "$asn";
    }


    /**
     * Add a target to the hash table
     * @param string $target
     */
    private function add_target($target)
    {
        for ($i = 0; $i < $this->replicas; $i ++)
        {
            $this->target_buckets[crc32($target . $this->identifier . $i)] = $target;
        }
        $this->update_sorted_hashes();
    }

    /**
     * Remove a target from the hash table...
     * @param string $target
     */
    private function remove_target($target)
    {
        unset($this->globally_accessible[$target]);
        for ($i = 0; $i < $this->replicas; $i ++)
        {
            unset($this->target_buckets[crc32($target . $this->identifier . $i)]);
        }
        $this->update_sorted_hashes();
    }

    /**
     * Update the hash index
     */
    private function update_sorted_hashes()
    {
        $sorted_hashes = array_keys($this->target_buckets);
        sort($sorted_hashes);
        $this->sorted_hashes = $sorted_hashes;
    }
}

?>