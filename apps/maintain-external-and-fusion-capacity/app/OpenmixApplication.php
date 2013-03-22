<?php
/**
 * Choose valid regions from an external file associated with a Cloud Region 
 * measured by Radar
 */
class OpenmixApplication implements Lifecycle
{
    /* Which regions and within that region which hostname is most trusted? */
    public $platforms = array(
        'softlayer_ams' => array( 'cname' => 'sl_eu01.cedexis.com', 'padding' => 0),
        'ec2_us_east' => array( 'cname' => 'ec2_useast01.cedexis.com', 'padding' => 0),
        'ec2_us_west_ca' => array( 'cname' => 'ec2_uswestca01.cedexis.com', 'padding' => 0),
        'ec2_asia_se_singapore' => array( 'cname' => 'ec2_sin01.cedexis.com', 'padding' => 0)
    );

    /** Openmix is sometimes unable to calculate a response
        This should be the region your trust the most or the region
        with the best global response time relative to your web visitors
    */
    private $fallback = 'ec2_us_east';
    private $multiplier = 2.0;
    
    private $reasons = array(
        'Best Region' => 'A',
        'All regions eliminated' => 'B',
        'Only one destination available' => 'C',
        'Data problem' => 'D'
    );
    
    private $ttl = 20;
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {

        // Only Need to pull in a single file. Which CDN the Load URL is associated with
        // is unimportant. Load URLs are configured via the portal > Platforms > Advanced > Sonar
        // TODO: Source the same file from multiple locations for redundancy
        $config->declareInput(PulseProperties::LOAD, 'ec2_us_east');

        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->platforms)));

        foreach ($this->platforms as $alias => $data)
        {
            $config->declareResponseOption($alias, $data['cname'], $this->ttl);
        }

        foreach ($this->reasons as $code => $explanation)
        {
            $config->declareReasonCode($explanation);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        $configData = $request->pulse(PulseProperties::LOAD);
        //print("\nPulse data:\n" . print_r($configData, true));
        $regions = array();
        $candidates = $this->platforms;
        # Count of available regions
        $instances = 0;

        if (is_array($configData))
        {
            
            $val = $configData['ec2_us_east'];
            //print("\nVal:\n" . print_r($val, true));
            
            $rows = explode("\n", $val);
            foreach ($rows as $row)
            {
                if ($row[0] === '#' || count($row[0]) < 1)
                {
                    continue;
                }
                
                $instances++;
                list($region,$hostname,$status) = explode(',', $row);
                if (array_key_exists($region, $regions))
                {
                    $regions[$region][$hostname] = $status;
                } else
                {
                    $regions[$region] = array($hostname => $status);
                }
            }
        }

        //print_r($regions);
        //In case $regions is empty
        if ($instances == 0)
        {
            $response->selectProvider($this->fallback);
            $response->setReasonCode($this->reasons['All regions eliminated']);
            // stop further execution
            return;
        } elseif ($instances == 1)
        {
            $response->selectProvider($regions[key($regions)]);
            $response->setReasonCode($this->reasons['Only one destination available']);
            return; 
        } else
        {
            //calculate padding based the capacity of each instance in the region
            foreach($regions as $region => $destinations)
            {
                 $elements = count($destinations);
                 // Assume a capacity scale of 1-10 where 10 is best
                 $perfect = $elements * 10;
                 $actual = 0;
                 foreach ($destinations as $hostname => $status)
                 {
                     $actual += $status;
                 }
                 if ($actual < $perfect)
                 {
                     // Direct traffic away from regions with struggling instances
                     // by handicapping the Radar RTT score of that region
                     $padding = (floatval($actual) / floatval($perfect) * $this->multiplier * 100);
                     $candidates[$region]['padding'] = $padding;
                 }
             }
        }

        //print_r($candidates);

        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        $considered = array();
        $chosen_region = '';
        
        if (is_array($rtt))
        {
            // Add penalties
            foreach (array_keys($rtt) as $i)
            {
                 $padding = 1 + floatval($candidates[$i]['padding']) / 100;
                 $rtt[$i] = $rtt[$i] * $padding;
            }

            $candidates = array_intersect_key($rtt, $candidates);
            // put the fastest first
            asort($candidates);
            //print_r($candidates);
            foreach($candidates as $aws_region => $milliseconds)
            {
            
                #check to see if we have any choices within that region
                #$regions[region] = array($hostname => $status, $hostname => $status, $hostname => $status);
                foreach ($regions as $region => $destinations)
                {
                    if ($region === $aws_region)
                    {
                        $considered = $destinations;
                        $chosen_region = $region;
                        //print("Chosen: $chosen_region\n");
                        continue;
                    }
                }

                
                if (count($considered) > 0)
                {
                    //print_r($considered);
                    // Now weighted round robin within the destinations
                    $hostname = $this->weighted_round_robin($considered);
                    $response->setReasonCode($this->reasons['Best Region']);
                    $response->selectProvider($chosen_region);
                    $response->setCName($hostname);
                    return;
                }
            }
        } else
        {
            // In the unlikely event there is no RTT data just round robin between regions
            // Alternatively we could GEO target here
            // First convert regions to simple list
            $list_of_regions = array_keys($regions);
            $idx = $this->rand(0, count($list_of_regions) - 1);
            print("idx: $idx\n");
            //pick a random region
            $region = $list_of_regions[$idx];
            $considered = $regions[$region];
            // But we can still do a weighted round robin within the region
            $hostname = $this->weighted_round_robin($considered);
            $response->setReasonCode($this->reasons['Best Region']);
            $response->selectProvider($chosen_region);
            $response->setCName($hostname);
            return;
        }
        
        $response->setReasonCode($this->reasons['Data Problem']);
        $response->selectProvider($fallback);
    }
    

    /* This method just wraps the PHP rand function, but provides
     * a seam that can be used in unit testing.
     */
    public function rand($min, $max)
    {
        return $min == $max ? $min : rand($min, $max);
    }

    public function weighted_round_robin($considered)
    {
        $totalWeight = array_sum($considered);
        $random = $this->rand(0, $totalWeight - 1);
        print("$totalWeight $random\n");
        $mark = 0;
        foreach ($considered as $hostname => $weight) 
        {
            // Add this candidate's weight to mark
            $mark += $weight;

            // Check whether this candidate pushed `$mark` past `$random`. If
            // so then respond with the current candidate.
            if ($random < $mark) {
                print("random: $random mark: $mark\n");
                return $hostname;
            }
        }
    }
}
?>
