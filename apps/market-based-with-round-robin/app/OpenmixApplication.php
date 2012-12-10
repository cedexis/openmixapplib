<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    private $providers = array(
        'probe1.atl.tmd.prod' => '65.254.36.226',
        'probe1.rbx.ovh.prod' => '94.23.254.99',
        'probe1.sbg.ovh.prod' => '37.59.8.25',
        'probe1.sin.sl.prod' => '119.81.23.243',
        'probe1.sjc.sl.prod' => '50.97.227.68',
    );
    
    private $ttl = 20;
    
    //if geo.market = NA or SA
    //    round robin between (probe1.sjc.sl.prod, 50.97.227.68)
    //                    and (probe1.atl.tmd.prod,65.254.36.226)
    //  
    //if geo.market= EU or AF
    //    round-robin between (probe1.rbx.ovh.prod,94.23.254.99
    //                    and (probe1.sbg.ovh.prod,37.59.8.25)
    //  
    //if geo.market = AS or OC
    //    round-robin between (probe1.sin.sl.prod,119.81.23.243)
    //                    and (probe1.sjc.sl.prod, 50.97.227.68)
    //  
    //if unknown
    //    round robin between (probe1.atl.tmd.prod,65.254.36.226)
    //                    and (probe1.sbg.ovh.prod,37.59.8.25)
    
    private $market_map = array(
        'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
        'SA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
        'EU' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod' ),
        'AF' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod' ),
        'AS' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
        'OC' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
    );
    
    private $default_providers = array( 'probe1.atl.tmd.prod', 'probe1.sbg.ovh.prod' );
    
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
