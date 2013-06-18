<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    private $default_provider = 'cdn1';
    
    private $primary_providers = array(
        'cdn1' => 'foo.cdn1.com',
        'cdn2' => 'foo.cdn2.com'
    );
    
    private $failover_providers = array(
        'dc1' => 'foo.dc1.com',
        'dc2' => 'foo.dc2.com',
        'dc3' => 'foo.dc3.com'
    );
    
    private $reasons = array(
        'primary selected' => 'A',
        'failover selected' => 'B',
        'default selected' => 'C'
    );
    
    private $ttl = 20;
    private $sonar_threshold = 90;
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(
            PulseProperties::SONAR,
            implode(
                ',',
                array_keys(
                    array_merge(
                        $this->primary_providers,
                        $this->failover_providers))));
        
        foreach ($this->reasons as $code) {
            $config->declareReasonCode($code);
        }
        
        foreach ($this->primary_providers as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
        
        foreach ($this->failover_providers as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request, $response, $utilities)
    {
        $sonar = $request->pulse(PulseProperties::SONAR);
        //print("\nSonar data:\n" . print_r($sonar, true));
        if ($this->select_from($sonar, $this->primary_providers, $response)) {
            $response->setReasonCode($this->reasons['primary selected']);
            return;
        }
        if ($this->select_from($sonar, $this->failover_providers, $response)) {
            $response->setReasonCode($this->reasons['failover selected']);
            return;
        }
        $response->selectProvider($this->default_provider);
        $response->setReasonCode($this->reasons['default selected']);
    }
    
    private function select_from($sonar, $providers, $response) {
        $candidates = array();
        foreach (array_keys($providers) as $i) {
            if (array_key_exists($i, $sonar)) {
                if ($sonar[$i] >= $this->sonar_threshold) {
                    array_push($candidates, $i);
                }
            }
        }
        //print("\nCandiates:\n" . print_r($candidates, true));
        if (1 < count($candidates)) {
            $index = $this->get_rand(0, count($candidates) - 1);
            $response->selectProvider($candidates[$index]);
            return true;
        }
        elseif (1 === count($candidates)) {
            $response->selectProvider($candidates[0]);
            return true;
        }
        return false;
    }
    
    public function set_default_provider($value) {
        $this->default_provider = $value;
    }
    
    public function set_primary_providers($value) {
        $this->primary_providers = $value;
    }
    
    public function set_failover_providers($value) {
        $this->failover_providers = $value;
    }
    
    public function set_ttl($value) {
        $this->ttl = $value;
    }
    
    public function set_sonar_threshold($value) {
        $this->sonar_threshold = $value;
    }
    
    public function get_rand($min, $max) {
        return rand($min, $max);
    }
}

?>
