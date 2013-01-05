<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    public $providers = array(
        'pacific-1' => 'pacific-1.example.com',
        'pacific-2' => 'pacific-2.example.com',
        'atlantic-1' => 'atlantic-1.example.com',
        'atlantic-2' => 'atlantic-2.example.com',
    );
    
    private $ttl = 20;
    
    
    public $market_map = array(
        'NA' => array( 'pacific-2', 'atlantic-1' ),
        'SA' => array( 'pacific-2', 'atlantic-2' ),
        'EU' => array( 'atlantic-1', 'atlantic-2' ),
        'AF' => array( 'atlantic-2' ),
        'AS' => array( 'pacific-1', 'pacific-2' ),
        'OC' => array( 'pacific-1' ),
    );
    
    private $default_providers = array( 'pacific-1', 'pacific-2', 'atlantic-1', 'atlantic-2' );
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareInput(GeoProperties::MARKET);
        
        foreach ($this->providers as $alias => $cname) {
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
        $market = $request->geo(GeoProperties::MARKET);
        //print("\nMarket: $market");
        
        $candidates = $this->default_providers;
        if (array_key_exists($market, $this->market_map)) {
            $candidates = $this->market_map[$market];
        }
        //print("\nCandidates: " . print_r($candidates, true));
        
        $random = $this->rand(0, count($candidates) - 1);
        //print("\nRandom: $random");
        
        $alias = $candidates[$random];
        //print("\nSelecting: $alias");
        
        $response->selectProvider($alias);
    }
    
    /**
     * This method just wraps the PHP rand function, but provides
     * a seam that can be used in unit testing.
     */
    public function rand($min, $max)
    {
        return rand($min, $max);
    }
}

?>