<?php
/**
 * This application demonstrates using Pulse Load to obtain cloud provider
 * "cost", routing traffic away from a provider once it reaches a certain
 * threshold.  Any servers below the cost threshold will be load-balanced
 * with origin based on round-trip time performance.
 */
class OpenmixApplication implements Lifecycle
{
    private $providers = array(
        'origin' => 'www.example.com',
        'cdn1' => 'www.example.somecdn.com'
    );
    
    private $reasons = array(
        'Best performance' => 'A',
        'All servers over cost threshold' => 'B',
        'Data problem' => 'C'
    );
    
    private $ttl = 20;
    
    /**
     * @var array Maps public providers to cost limits
     */
    private $limits = array(
        'cdn1' => 2000
    );
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        foreach ($this->providers as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
        
        $config->declareInput(PulseProperties::LOAD, implode(',', array_keys($this->providers)));
        $config->declareInput(RadarProbeTypes::HTTP_RTT, implode(',', array_keys($this->providers)));
        
        array_map(array($config, 'declareReasonCode'), $this->reasons);
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request, $response, $utilities)
    {
        $pulseData = $request->pulse(PulseProperties::LOAD);
        //print("\nPulse data:\n" . print_r($pulseData, true));
        
        $rttData = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nRTT data:\n" . print_r($rttData, true));
        
        if (!is_array($pulseData) || (1 > count($pulseData))
            || !is_array($rttData) || (1 > count($rttData)))
        {
            $utilities->selectRandom();
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        $candidates = array('origin');
        foreach ($pulseData as $alias => $content)
        {
            if (array_key_exists($alias, $this->limits)
                && (intval($content) < $this->limits[$alias]))
            {
                array_push($candidates, $alias);
            }
        }
        //print("\nCandidates: " . print_r($candidates, true));
        if (1 == count($candidates))
        {
            $response->selectProvider(key($rttData));
            $response->setReasonCode($this->reasons['All servers over cost threshold']);
            return;
        }
        $rttData = array_intersect_key($rttData, array_flip($candidates));
        asort($rttData);
        $response->selectProvider(key($rttData));
        $response->setReasonCode($this->reasons['Best performance']);
    }
}

?>