<?php


class OpenmixApplication implements Lifecycle {
    /**
    * @var The list of available CNAMEs, keyed by alias.
    */
    public $providers = array(
        'provider1' => array('cname' => 'cname1.foo.com', 'padding' => 0),
        'provider2' => array('cname' => 'cname2.foo.com', 'padding' => 10),
        'provider3' => array('cname' => 'cname3.foo.com', 'padding' => 0)
    );
    
    private $reasons = array(
        'Best performing provider = previous' => 'A',
        'Either no previous or previous < availThreshold' => 'B',
        'Choosing previous. Best performing within varianceThreshold' => 'C',
        'New provider > varianceThreshold, setting new provider' => 'D',
        'All providers eliminated' => 'E',
        'Data problem' => 'F',
        'Unexpected previous alias' => 'G'
    );
    
    private $ttl = 30;
    
    private $availabilityThreshold = 80;
    private $varianceThreshold = .65;
    
    public $saved = array();
    public $freqtable = array();
    public $entries = 0;
    
    // Do not adjust above 800
    private $max = 800;
    
    /**
     * @param Configuration $config
     */
    public function init($config) {
        gc_enable();
        $config->declareInput(EDNSProperties::ENABLE);
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providers)));
        
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providers)));
        
        //need these to key into saved
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);
        $config->declareInput(GeoProperties::ASN);
        $config->declareInput(EDNSProperties::ASN);
        $config->declareInput(EDNSProperties::COUNTRY);
        $config->declareInput(EDNSProperties::MARKET);
        
        foreach ($this->providers as $alias => $data) {
            $config->declareResponseOption($alias, $data['cname'], $this->ttl);
        }
        
        foreach ($this->reasons as $code) {
            $config->declareReasonCode($code);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     */
    public function service($request, $response, $utilities) {
        $key = $this->get_key($request);
        //print("\nKey: $key");
        $this->update_sticky_data($key);
        $previous = null;
        if (array_key_exists($key, $this->saved)) {
            $previous = $this->saved[$key];
            if (!is_null($previous) && !array_key_exists($previous, $this->providers)) {
                $utilities->selectRandom();
                $response->setReasonCode($this->reasons['Unexpected previous alias']);
                return;
            }
        }
        //print("\nPrevious alias: $previous");
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nRTT:\n" . print_r($rtt, true));
        if (is_array($rtt)) {
            $candidates = array_intersect_key($rtt, $this->providers);
            if (!empty($candidates)) {
                // Add penalties
                foreach (array_keys($rtt) as $i) {
                    $candidates[$i] += $this->providers[$i]['padding'];
                }
                // Select the best performing provider that meets its minimum
                // availability score, if given
                asort($candidates);
                //print("\nCandidates with penalty sorted:\n" . print_r($candidates, true));
                $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
                //print("\nAvail:\n" . print_r($avail, true));
                if (is_array($avail)) {
                    $avail = array_intersect_key($avail, $this->providers);
                    if (!empty($avail)) {
                        if (array_key_exists($previous, $candidates)) {
                            $testval = $this->varianceThreshold * $candidates[$previous];
                            //print("\nTest value: $testval");
                        }
                        foreach (array_keys($candidates) as $alias) {
                            if ($avail[$alias] >= $this->availabilityThreshold) {
                                //print("\n$alias is available");
                                //print("\n$alias perf: " . $candidates[$alias]);
                                if ($previous == $alias) {
                                    $response->selectProvider($alias);
                                    $response->setReasonCode($this->reasons['Best performing provider = previous']);
                                    return;
                                }
                                elseif (is_null($previous) ||
                                    is_null($avail[$previous]) ||
                                    is_null($candidates[$previous]) ||
                                    $avail[$previous] < $this->availabilityThreshold) {
                                    $response->selectProvider($alias);
                                    $response->setReasonCode($this->reasons['Either no previous or previous < availThreshold']);
                                    $this->saved[$key] = $alias;
                                    return;
                                }
                                else if ($candidates[$alias] < $testval) {
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
                        //print("\nAvail data sorted: " . print_r($avail, true));
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
        // If a specific provider hasn't been selected by this point,
        // select one randomly.
        $utilities->selectRandom();
    }
    
    public function get_microtime() {
        return microtime(true);
    }
    
    public function get_key($request) {
        $market = $request->geo(GeoProperties::MARKET);
        $country = $request->geo(GeoProperties::COUNTRY);
        $asn = $request->geo(GeoProperties::ASN);
        if ($request->geo(EDNSProperties::ENABLE)) {
            $market = $request->geo(EDNSProperties::MARKET);
            $country = $request->geo(EDNSProperties::COUNTRY);
            $asn = $request->geo(EDNSProperties::ASN);
        }
        return "$market-$country-$asn";
    }
    
    public function update_sticky_data($key) {
        if (!array_key_exists($key, $this->saved)) {
            // when at max, evict the last one added
            if ($this->entries >= $this->max) {
                asort($this->freqtable);
                $last_added = key($this->freqtable);
                unset($this->saved[$last_added]);
                unset($this->freqtable[$last_added]);
                gc_collect_cycles();
            }
            else {
                $this->entries += 1;
            }
            $this->saved[$key] = null;
        }
        
        // Update the frequency table
        $this->freqtable[$key] = $this->get_microtime();
    }
}
?>