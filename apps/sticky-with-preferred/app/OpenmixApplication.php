<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    
    /**
    * @var The list of available CNAMEs, keyed by alias.
    * penalty is a percentage. e.g. 10 = 10% slower (score * 1.1)
    */
    public $providers = array(
        'provider1' => array('cname' => 'provider1.foo.com', 'penalty' => 0),
        'provider2' => array('cname' => 'provider2.foo.com', 'penalty' => 0),
        'provider3' => array('cname' => 'provider3.foo.com', 'penalty' => 0)
    );
    
    private $ttl = 30;
    
    public $availabilityThreshold = 60;
    private $varianceThreshold = .65;
    
    public $preferred = array();
    
    public $reasons = array(
        'Data problem' => 'A',
        'Fastest provider' => 'B',
        'All providers below availability threshold' => 'C',
        'Preferred provider' => 'D',
        'Saved provider' => 'E',
    );
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(EDNSProperties::ENABLE);
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providers)));
        
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providers)));
        
        // need these to key into preferred provider mapping
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);
        $config->declareInput(GeoProperties::ASN);
        $config->declareInput(EDNSProperties::MARKET);
        $config->declareInput(EDNSProperties::COUNTRY);
        $config->declareInput(EDNSProperties::ASN);
        
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
     **/
    public function service($request, $response, $utilities)
    {
        $key = $this->get_key($request);
        $candidates = $request->radar(RadarProbeTypes::HTTP_RTT);
        //print("\nRTT:\n" . print_r($candidates, true));
        
        if (!is_array($candidates)) {
            $utilities->selectRandom();
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        $candidates = array_intersect_key($candidates, $this->providers);
        //print("\nCandidates:\n" . print_r($candidates, true));
        
        if (empty($candidates)) {
            $utilities->selectRandom();
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        // Add penalties
        foreach ($candidates as $alias => $rtt) {
            $padding = 1 + floatval($this->providers[$alias]['penalty']) / 100;
            $candidates[$alias] *= $padding;
        }
        //print("\nCandidates after penalty:\n" . print_r($candidates, true));
        
        //print("\nAvailability threshold: " . $this->availabilityThreshold);
        $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
        //print("\nAvail:\n" . print_r($avail, true));
        if (!is_array($avail)) {
            $utilities->selectRandom();
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        $avail = array_intersect_key($avail, $this->providers);
        if (empty($avail)) {
            $utilities->selectRandom();
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        $avail_filtered = array_filter($avail, array($this, 'filter_avail'));
        //print("\nAvail (filtered):\n" . print_r($avail_filtered, true));
        
        if (empty($avail_filtered)) {
            // No providers available. Select the most available.
            arsort($avail);
            $response->selectProvider(key($avail));
            $response->setReasonCode($this->reasons['All providers below availability threshold']);
            return;
        }
        
        $candidates = array_intersect_key($candidates, $avail_filtered);
        asort($candidates);
        //print("\nCandidates (filtered and sorted):\n" . print_r($candidates, true));
        $alias = key($candidates);
        //print("\nFastest: $alias, RTT: " . var_export($candidates[$alias], true));
        
        if (!array_key_exists($key, $this->preferred)) {
            // Not sticky. Do simple performance-based selection.
            $response->selectProvider($alias);
            $response->setReasonCode($this->reasons['Fastest provider']);
            return;
        }
        
        $saved_alias = null;
        if (array_key_exists('saved', $this->preferred[$key])) {
            $saved_alias = $this->preferred[$key]['saved'];
        }
        
        if (array_key_exists($saved_alias, $candidates)) {
            $test_val = $this->varianceThreshold * $candidates[$saved_alias];
            //print("\nSaved: $saved_alias, RTT: " . var_export($test_val, true));
            if ($candidates[$alias] < $test_val) {
                $response->selectProvider($alias);
                $response->setReasonCode($this->reasons['Fastest provider']);
                $this->preferred[$key]['saved'] = $alias;
                return;
            }
            $response->selectProvider($saved_alias);
            $response->setReasonCode($this->reasons['Saved provider']);
            $this->preferred[$key]['saved'] = $saved_alias;
            return;
        }
        
        // Fall back to the preferred provider
        $preferred_alias = $this->preferred[$key]['provider'];
        $test_val = $this->varianceThreshold * $candidates[$preferred_alias];
        //print("\nPreferred: $preferred_alias, RTT: " . var_export($test_val, true));
        
        if ($candidates[$alias] < $test_val) {
            $response->selectProvider($alias);
            $response->setReasonCode($this->reasons['Fastest provider']);
            $this->preferred[$key]['saved'] = $alias;
            return;
        }
        
        $response->selectProvider($preferred_alias);
        $response->setReasonCode($this->reasons['Preferred provider']);
        $this->preferred[$key]['saved'] = $preferred_alias;
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
    
    public function filter_avail($avail) {
        //print("\navail: $avail");
        if (is_numeric($avail)) {
            if ($avail >= $this->availabilityThreshold) {
                return true;
            }
        }
        return false;
    }
}

?>
