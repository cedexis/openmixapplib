<?php
/**
 * This app demonstrates using Pulse Load to obtain external decision routing 
 * configurations.
 * padding is in percent. 10 = 10% slower (score * 1.1)
 */
class OpenmixApplication implements Lifecycle
{
    // I reckoned you may want to be able to handicap more expensive CDNs
    public $providers = array(
        'akamai__vip' => array('cname' => 'provider1.example.com', 'padding' => 0),
        'cotendo' => array('cname' => 'provider2.example.com', 'padding' => 0),
        'cloudfront' => array('cname' => 'provider3.example.com', 'padding' => 0));
    
    private $ttl = 20;
    
    private $availabilityThreshold = 80;
    
    private $reasons = array(
        'Best performing provider' => 'A',
        'All providers eliminated' => 'B',
        'Data problem' => 'C'
    );
    
    // Openmix is sometimes unable to calculate a response
    // Generally fewer than 0.01% of responses over a month are fallback
    // We need one CDN that can return content from any site, based on the HTTP HOST HEADER
    // the browser passes through, though we can also append the subdomain if that helps
    private $fallback = array( 'akamai__vip' => 'fb.provider1.example.com');
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(RequestProperties::HOSTNAME);
        // Only Need to pull in a single file. Which CDN the Load URL is associated with
        // is unimportant. 
        $config->declareInput(PulseProperties::LOAD, 'akamai__vip');
        $config->declareInput(RadarProbeTypes::HTTP_RTT, implode(',', array_keys($this->providers)));
        $config->declareInput(RadarProbeTypes::AVAILABILITY, implode(',', array_keys($this->providers)));
        
        foreach ($this->providers as $alias => $providerSettings)
        {
            $config->declareResponseOption($alias, $providerSettings['cname'], $this->ttl);
        }
        
        array_map(array($config, 'declareReasonCode'), $this->reasons);
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        $hostname = $request->request(RequestProperties::HOSTNAME);
        //print("\nhostname: $hostname");
        $configData = $request->pulse(PulseProperties::LOAD);
        //print("\nPulse data:\n" . print_r($configData, true));
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nRTT data:\n" . print_r($rtt, true));
        
        $gotmatch = false;
        $dest_candidates = $this->providers;
        if (is_array($configData) && (count($configData) == 1) && strlen($hostname) > 0)
        {
            /**$response->selectProvider(key($this->fallback));
            $response->setCName("inif.cedexis.net");
            return;**/
            $val = $configData['akamai__vip'];
            //print("\nVal:\n" . print_r($val, true));
            
            $pstr = "";
            $rows = explode("\n", $val);
            foreach ($rows as $row)
            {
                
                if ($row[0] === '#') {
                    next;
                }
                /**
                 *use this to return the contents of your pulse load file
                $str = preg_replace('/[^a-z\d ]/i', '', $row);
                $pstr .= $str . '-';
                //$pstr .= "pos_" . $pos++ . "_pos_" . $row;
            }
            
            $response->selectProvider(key($this->fallback));
            $response->setCName($pstr . ".foo.cdx.net");
            return;
            
            if (false)
            {
            
                $arow = str_getcsv($row, ',');
                $response->selectProvider(key($this->fallback));
                $part = $arow[1] . $arow[2] . $arow[3];
                $response->setCName($part . ".inforeach.cedexis.net");
                return;
                **/
                // rewrite row as an array
                $row = str_getcsv($row, ',');
                //print("\nCurrent row data:\n" . print_r($row, true));
                if ($hostname == $row[0])
                {
                    // Associate the site specific destination CNAMEs
                    // with the providers
                    $gotmatch = true;
                    $dest_candidates['akamai__vip'] = $row[1];
                    $dest_candidates['cotendo'] = $row[2];
                    $dest_candidates['cloudfront'] = $row[3];
                    // Obviously, this depends on the CSV
                    // having the CDNs in the correct position.
                    // Later this quarter, we'll support JSON or YAML
                    // which may be easier to maintain on your side
                    break;
                }
            }
        }
        //print("\nGot match: $gotmatch");
        //print("\nCandidates:\n" . print_r($candidates,  true));
        if (is_array($rtt) && (0 < count($rtt)) && $gotmatch)
        {
            $candidates = array_intersect_key($rtt, $this->providers);
            //print("\nCandidates 2:\n" . print_r($candidates,  true));
            if (0 < count($candidates))
            {
                // Add penalties
                foreach (array_keys($rtt) as $i)
                {
                    $padding = 1 + floatval($this->providers[$i]['padding']) / 100;
                    $candidates[$i] = $candidates[$i] * $padding;
                }
                
                // Select the best performing provider that meets its minimum
                // availability score, if given
                asort($candidates);
                //print_r($candidates);
                $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
                foreach (array_keys($candidates) as $alias)
                {
                    if ($avail[$alias] >= $this->availabilityThreshold)
                    {
                        $response->selectProvider($alias);
                        $response->setCName($dest_candidates[$alias]);
                        $response->setReasonCode($this->reasons['Best performing provider']);
                        return;
                    }
                }
                // No provider passed the availability threshold. Select the most available.
                arsort($avail);
                //print_r($avail);
                $response->selectProvider(key($avail));
                $response->setCName($dest_candidates[key($avail)]);
                $response->setReasonCode($this->reasons['All providers eliminated']);
                return;
            }
            else
            {
                $response->setReasonCode($this->reasons['Data problem']);
            }
        }
        else
        {
            $response->setReasonCode($this->reasons['Data problem']);
        }
        $response->selectProvider(key($this->fallback));
        if (strlen($hostname) > 0)
        {
            $response->setCName($hostname . "." . $this->fallback[key($this->fallback)]);
        } else
        {
            $response->setCName($this->fallback[key($this->fallback)]);
        }
    }
}

?>