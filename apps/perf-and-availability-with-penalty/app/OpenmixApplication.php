<?php


class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     * padding is in percent. 10 = 10% slower (score * 1.1)
     */
    public $providers = array(
        'provider1' => array('cname' => 'provider1.example.com', 'padding' => 0),
        'provider2' => array('cname' => 'provider2.example.com', 'padding' => 10),
        'provider3' => array('cname' => 'provider3.example.com', 'padding' => 10));
    
    private $reasons = array(
        'Best performing provider selected' => 'A',
        'Data problem' => 'B',
        'All providers eliminated' => 'C');
    
    private $ttl = 20;
    
    private $availabilityThreshold = 90;
    
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
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
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
