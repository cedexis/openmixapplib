<?php


class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     */
    public $servers = array(
        'origin' => 'origin.customer.net',
        'thiscdn' => 'www.customer.net.thiscdn.net');
    
    private $reasons = array(
        'Best performing server selected' => 'A',
        'Data problem' => 'B',
        'All servers eliminated' => 'C');
    
    private $ttl = 20;
    
    private $availabilityThreshold = 90;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->servers)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->servers)));
        
        foreach ($this->servers as $alias => $cname)
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
     */
    public function service($request, $response, $utilities)
    {
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        if (is_array($rtt)) {
            $candidates = array_intersect_key($rtt, $this->servers);
            if (0 < count($candidates))
            {
                // Select the best performing server that meets its minimum
                // availability score, if given
                asort($candidates);
                $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
                foreach (array_keys($candidates) as $alias)
                {
                    if ($avail[$alias] >= $this->availabilityThreshold)
                    {
                        $response->selectProvider($alias);
                        $response->setReasonCode($this->reasons['Best performing server selected']);
                        return;
                    }
                }
                // No servers passed the availability threshold, select the most available
                arsort($candidates);
                $response->selectProvider(key($candidates));
                $response->setReasonCode($this->reasons['All servers eliminated']);
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
