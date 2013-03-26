<?php


class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     * padding is in percent. 10 = 10% slower (score * 1.1)
     */
    public $providers = array(
        'akamai' => array('cname' => 'akamai.example.com', 'padding' => 0),
        'edgecast__small' => array('cname' => 'edgecast.example.com', 'padding' => 0),
        'origin' => array('cname' => 'a.origin.com', 'padding' => 0),
        );
    
    private $reasons = array(
        'Best performing provider selected' => 'A',
        'Data problem' => 'B',
        'All providers eliminated' => 'C');
    
    private $ttl = 30;
    
    private $availabilityThreshold = 90;

    /*Which CDNs are burstable?
    *
    * 'threshold'
    * 95/5 commit threshold. If usage exceeds this threshold for ~36
    * hours in a month many CDNs will charge a busrting fee
    * http://en.wikipedia.org/wiki/Burstable_billing
    * If current usage exceeds this commit, apply padding
    * to the CDN that is receiving too much traffic
    *
    * 'multiplier'
    * Given the expected relative performance of the CDN
    * in question versus other CDN options, how much of a multiplier should be applied
    * to the percent over the mbps_threshold when calculating the padding?
    * For example, if the CDNs are generally tied on the networks
    * from where you get traffic, set this to 1, if the CDN with the
    * bursting fee is generally 10% faster, set this to 1.1 or higher
    * to ensure the bursting CDN is penalized enough to avoid bursting charges
    */
    private $burstable_cdns = array(
        'akamai' => array('threshold' => 100, 'multiplier' => 1.5)
    );

    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        foreach($this->burstable_cdns as $alias => $settings)
        {
            $config->declareInput(FusionProperties::MBPS, $alias);
        } 
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providers)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providers)));
        
        foreach ($this->providers as $alias => $providerSettings)
        {
            $config->declareResponseOption($alias, $providerSettings['cname'], $this->ttl);
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
        $mbps = $request->fusion(FusionProperties::MBPS);
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        if (is_array($mbps))
        {
            foreach ($this->burstable_cdns as $cdn => $settings)
            {
                if ($mbps[$cdn] > $settings['threshold'])
                {
                    $default_pad = $this->providers[$cdn]['padding'];
                    $padding = (floatval($mbps[$cdn]) / $settings['threshold']) *
                               $settings['multiplier'] * 100;
                    $this->providers[$cdn]['padding'] = ($default_pad + $padding);
                }
            }
        }


        if (is_array($rtt) && (0 < count($rtt)))
        {
            $candidates = array_intersect_key($rtt, $this->providers);
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
                        $response->setReasonCode($this->reasons['Best performing provider selected']);
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
        $utilities->selectRandom();
    }

        
}
?>
