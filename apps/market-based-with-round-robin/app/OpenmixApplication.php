<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    public $providers = array(
        'probe1.rbx.ovh.prod' => '94.23.254.99',
        'probe1.sbg.ovh.prod' => '37.59.8.25',
        'probe1.ams.hw.prod' => '81.171.102.234',
        'probe1.phx.hw.prod' => '209.197.5.130',
        'probe1.sjc.edg.prod' => '46.22.79.39',
        'probe1.lax.llnw.prod' => '69.28.181.2',
        'probe1.lga.llnw.prod' => '69.28.155.82',
        'probe1.lhr.edg.prod' => '72.21.90.135',
        'probe1.atl.tmd.prod' => '65.254.36.226',
    );
    
    private $ttl = 20;
    
    
    public $market_map = array(
        'NA' => array( 'probe1.phx.hw.prod', 'probe1.sjc.edg.prod', 'probe1.lax.llnw.prod', 'probe1.lga.llnw.prod' ),
        'SA' => array( 'probe1.phx.hw.prod', 'probe1.sjc.edg.prod', 'probe1.lax.llnw.prod', 'probe1.lga.llnw.prod' ),
        'EU' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod', 'probe1.ams.hw.prod', 'probe1.lhr.edg.prod' ),
        'AF' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod', 'probe1.ams.hw.prod', 'probe1.lhr.edg.prod' ),
        'AS' => array( 'probe1.sjc.edg.prod', 'probe1.lax.llnw.prod'),
        'OC' => array( 'probe1.sjc.edg.prod', 'probe1.lax.llnw.prod' ),
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