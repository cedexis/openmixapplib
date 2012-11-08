<?php
/**
 * Performance with penalty
 */
class OpenmixApplication implements Lifecycle
{

    private $servers = array(
      'cdn1' => array('cname' => 'www.example.com.cdn1.net', 'padding' => 0),
      'cdn2' => array('cname' => 'cdn.example.com.cdn2.net', 'padding' => 0),
      'cdn3' => array('cname' => 'origin.example.com', 'padding' => 30)
    );   
    
    private $reasons = array(
        'Best performing server selected' => 'A',
        'Data problem' => 'B',
        'All servers eliminated' => 'C');
    
    private $ttl = 30;
    
    private $availabilityThreshold = 90;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(EDNSProperties::ENABLE);
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->servers)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->servers)));
        
        foreach ($this->servers as $alias => $data)
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
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nRTT: " . print_r($rtt, true));
        if (is_array($rtt) && (0 < count($rtt)))
        {
            $candidates = array_intersect_key($rtt, $this->servers);
            //print("\nCandidates: " . print_r($candidates, true));
            if (0 < count($candidates))
            {
                // Select the best performing server that meets its minimum
                // availability score, if given, and adjust it with a penalty
                foreach (array_keys($rtt) as $i)
                {
                    $candidates[$i] += $this->servers[$i]['padding'];
                }
                asort($candidates);
                //print("\nCandidates with penalty (sorted): " . print_r($candidates, true));
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
