<?php


class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     */
    public $providers = array(
        // Percent the provider is to be considered. They do not need to
        // add up to 100. e.g. 100 means the provider is always considered. 50 means
        // the provider is considered approximately half the time, 0 means the provider is
        // never considered, etc.
        'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
        'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
        'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
    );

    // For certain markets, over ride the defaults
    public $market_overrides = array(
        'NA' => array('cdn1' => 25, 'cdn2' => 75),
        'OC' => array('cdn1' => 10, 'cdn3' => 90),
        'EU' => array('cdn2' => 5),
        'AS' => array('cdn1' => 10, 'cdn3' => 90),
        //'AF' => 'rackspace_cloud_ord',
        //'SA' => array('cdn3' => 0),
    );

    // For certain countries over ride the defaults
    public $country_overrides = array(
        'GB' => array('cdn1' => 25, 'cdn2' => 75),
        'BR' => array('cdn3' => 0),
    );
    
    private $reasons = array(
        'A', // Best performing provider selected
        'B', // All providers eliminated
        'C', // One provider considered
        'D', // Data problem
    );
    
    private $ttl = 20;
    
    public $availabilityThreshold = 90;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providers)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providers)));

        $config->declareInput(EDNSProperties::ENABLE);
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(EDNSProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);
        $config->declareInput(EDNSProperties::COUNTRY);
        
        foreach ($this->providers as $alias => $data)
        {
            $config->declareResponseOption($alias, $data['cname'], $this->ttl);
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
     */
    public function service($request, $response, $utilities)
    {
        $market = $request->geo(GeoProperties::MARKET);
        $country = $request->geo(GeoProperties::COUNTRY);
        if ($request->geo(EDNSProperties::ENABLE)) {
            $market = $request->geo(EDNSProperties::MARKET);
            $country = $request->geo(EDNSProperties::COUNTRY);
        }
        //print("\nmarket: $market");
        //print("\ncountry: $country");
        $candidates = $this->providers;
        if (isset($this->market_overrides[$market]))
        {
            //print("\nmarket $market is in overrides");
            foreach ($this->market_overrides[$market] as $cdn => $percent_considered) 
            {
                $candidates[$cdn]['percentage'] = $percent_considered;
            }
        }

        if (isset($this->country_overrides[$country]))
        {
            //print("\ncountry $country is in overrides");
            foreach ($this->country_overrides[$country] as $cdn => $percent_considered) 
            {
                $candidates[$cdn]['percentage'] = $percent_considered;
            }
        }

        $random = $this->rand(0, 99);
        //print("\nrandom: $random");
        foreach ($candidates as $alias => $data)
        {
            //print("\ntesting $alias:\n" . print_r($data, true));
            if ($random >= $data['percentage'])
            {
                unset($candidates[$alias]);
            }
        }
        reset($candidates);
        //print("\nactive candidates:\n" . print_r($candidates, true));
        // Skip the rest if there is only one provider to consider
        if (count($candidates) == 1)
        {
            $response->setReasonCode('C');
            $response->selectProvider(key($candidates));
            return;
        }

        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nrtt:\n" . print_r($rtt, true));
        $candidates = array_intersect_key($rtt, $candidates);
        //print("\ncandidates RTT:\n" . print_r($candidates, true));
        
        if (empty($candidates)) {
            $response->setReasonCode('D');
            $utilities->selectRandom();
            return;
        }
        
        // Select the best performing provider that meets its minimum
        // availability score, if given
        asort($candidates);
        $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
        //print("\navail:\n" . print_r($avail, true));
        if (empty($avail)) {
            $response->setReasonCode('D');
            $utilities->selectRandom();
            return;
        }
        
        foreach (array_keys($candidates) as $alias)
        {
            if (array_key_exists($alias, $avail))
            {
                if ($avail[$alias] >= $this->availabilityThreshold)
                {
                    $response->selectProvider($alias);
                    $response->setReasonCode('A');
                    return;
                }
            }
        }
        // No provider passed the availability threshold. Select the most available.
        // Ignoring the Bleed In Percentage since presumably even a cold cache is better than an unavailable CDN
        arsort($avail);
        $response->selectProvider(key($avail));
        $response->setReasonCode('B');
    }
   /**
     * This method just wraps the PHP rand function, but provides
     * a seam that can be used in unit testing.
     */
    public function rand($min, $max)
    {
        return rand($min, $max);
    }
}
?>
