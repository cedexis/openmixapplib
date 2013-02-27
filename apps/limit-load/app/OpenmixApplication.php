<?php
/**
 * This app demonstrates using Fusion Custom to obtain current load data for each
 * provider.  It uses this information to filter out providers that are currently
 * overloaded.  Of the remaining providers, it selects the best-performing one.
 * If all providers are overloaded, it selects the best-performing overall.
 */
class OpenmixApplication implements Lifecycle
{
    private $providers = array(
        'cdn1' => array('cname' => 'www.example.coolcdn.com', 'threshold' => 100),
        'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'threshold' => 100),
        'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'threshold' => 100)
    );
    
    private $ttl = 20;
    
    private $reasons = array(
        'Best performing provider' => 'A',
        'All servers over threshold' => 'B',
        'Data problem' => 'C'
    );
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        foreach ($this->providers as $alias => $data)
        {
            $config->declareResponseOption($alias, $data['cname'], $this->ttl);
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
    public function service($request,$response,$utilities)
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
        
        // Ensure $pulseData only contains the providers we recongnize
        $pulseData = array_intersect_key($pulseData, $this->providers);
        
        $candidates = array();
        foreach ($pulseData as $alias => $content)
        {
            if (intval($content) < $this->providers[$alias]['threshold'])
            {
                array_push($candidates, $alias);
            }
        }
        //print("\nCandidates:\n" . print_r($candidates, true));
        
        if (0 == count($candidates))
        {
            // All servers overloaded
            $response->setReasonCode($this->reasons['All servers over threshold']);
        }
        else
        {
            // Filter RTT performance data by candidates
            $rttData = array_intersect_key($rttData, array_flip($candidates));
            $response->setReasonCode($this->reasons['Best performing provider']);
        }
        asort($rttData);
        //print("\nRemaining RTT (sorted):\n" . print_r($rttData, true));
        $response->selectProvider(key($rttData));
    }
}

?>
