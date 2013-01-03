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
        'cdn1' => array('cname' => 'provider1.example.com', 'padding' => 0),
        'cdn2' => array('cname' => 'provider2.example.com', 'padding' => 0),
        'cdn3' => array('cname' => 'provider3.example.com', 'padding' => 0));
    
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
    private $fallback = array( 'cdn1' => 'provider1.example.com');
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(RequestProperties::HOSTNAME);
        // Only Need to pull in a single file. Which CDN the Load URL is associated with
        // is unimportant. 
        $config->declareInput(PulseProperties::LOAD, 'cdn1');
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
        $candidates = $this->providers;
        if (is_array($configData) && (count($configData) == 1) && strlen($hostname) > 0)
        {
            $rows = explode("\n", $configData['cdn1']);
            //print("\nRows:\n" . print_r($rows, true));
            foreach ($rows as $row)
            {
                //print("\nRaw row: $row");
                $row = str_getcsv($row, ',');
                //print("\nCurrent row data:\n" . print_r($row, true));
                if ($hostname == $row[0])
                {
                    // Associate the site specific destination CNAMEs
                    // with the providers
                    $gotmatch = true;
                    $candidates['cdn1'] = $row[1];
                    $candidates['cdn2'] = $row[2];
                    $candidates['cdn3'] = $row[3];
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
                        $response->setReasonCode($this->reasons['Best performing provider']);
                        return;
                    }
                }
                // No provider passed the availability threshold. Select the most available.
                arsort($avail);
                //print_r($avail);
                $response->selectProvider(key($avail));
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