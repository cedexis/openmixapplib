<?php

class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     */
    public $providers = array(
        'provider1' => 'cname1.foo.com',
        'provider2' => 'cname2.foo.com');
    
    private $reasons = array(
        'Best performing provider = previous' => 'A',
        'Either no previous or previous < availThreshold' => 'B',
        'Choosing previous. Best performing within varianceThreshold' => 'C',
        'New provider > varianceThreshold, setting new provider' => 'D',
        'All providers eliminated' => 'E',
        'Data problem' => 'F');
    
    private $ttl = 20;
    
    private $availabilityThreshold = 90;
    private $varianceThreshold = 0.75;
    
    public $saved = array();
    private $startmem = 0;
    private $entries = 0;
    private $max = 800;
    private $freqtable = array();
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        gc_enable();
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providers)));
        
        $this->startmem = memory_get_usage();
        //need these to key into saved
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);
        $config->declareInput(GeoProperties::ASN);
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providers)));
        
        foreach ($this->providers as $alias => $cname)
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
        $market = $request->geo(GeoProperties::MARKET);
        $country = $request->geo(GeoProperties::COUNTRY);
        $asn = $request->geo(GeoProperties::ASN);
        $key = "$market-$country-$asn";
        
        if (!array_key_exists($key, $this->saved)) {
            // when at max, evict the LRU
            if ($this->entries >= $this->max) {
                asort($this->freqtable);
                $lru = key($this->freqtable);
                
                unset($this->saved[$lru]);
                unset($this->freqtable[$lru]);
                
                gc_collect_cycles();
            }
            else {
                $this->entries += 1;
            }
            $this->saved[$key] = null;
        }
        
        $this->freqtable[$key] = microtime(true);
        $previous = $this->saved[$key];
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        if (is_array($rtt)) {
            $candidates = array_intersect_key($rtt, $this->providers);
            if (!empty($candidates)) {
                // Select the best performing provider that meets its minimum
                // availability score, if given
                asort($candidates);
                $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
                if (is_array($avail)) {
                    $avail = array_intersect_key($avail, $this->providers);
                    if (!empty($avail)) {
                        foreach (array_keys($candidates) as $alias) {
                            if (isset($candidates[$previous])) {
                                $testval = $this->varianceThreshold*$candidates[$previous];
                            }                            
                            if ($avail[$alias] >= $this->availabilityThreshold) {
                                if ($previous == $alias) {
                                    $response->selectProvider($alias);
                                    $response->setReasonCode($this->reasons['Best performing provider = previous']);
                                    return;
                                }
                                elseif (is_null($previous) || is_null($avail[$previous]) ||
                                        is_null($candidates[$previous]) || $avail[$previous] < $this->availabilityThreshold) {
                                    $response->selectProvider($alias);
                                    $response->setReasonCode($this->reasons['Either no previous or previous < availThreshold']);
                                    $this->saved[$key] = $alias;
                                    return;
                                }
                                elseif ($candidates[$alias] < $testval) {
                                    $response->selectProvider($alias);
                                    $response->setReasonCode($this->reasons['New provider > varianceThreshold, setting new provider']);
                                    $this->saved[$key] = $alias;
                                    return;
                                }
                                $response->selectProvider($previous);
                                $response->setReasonCode($this->reasons['Choosing previous. Best performing within varianceThreshold']);
                                return;
                            }
                        }
                        // No provider passed the availability threshold. Select the most available.
                        arsort($avail);
                        $alias = key($avail);
                        $response->selectProvider($alias);
                        $this->saved[$key] = $alias;
                        $response->setReasonCode($this->reasons['All providers eliminated']);
                        return;
                    }
                    else {
                        $response->setReasonCode($this->reasons['Data problem']);
                    }
                }
                else {
                    $response->setReasonCode($this->reasons['Data problem']);
                }
            }
            else {
                $response->setReasonCode($this->reasons['Data problem']);
            }
        }
        else {
            $response->setReasonCode($this->reasons['Data problem']);
        }
        $utilities->selectRandom();
    }
}
?>

