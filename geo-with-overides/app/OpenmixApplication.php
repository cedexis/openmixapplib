<?php

/**
 * Demonstrates the basic use of geographic market and country data.
 * Use Market data for most decsisions, but override certain countries.
 */
class OpenmixApplication implements Lifecycle
{
    private $servers = array(
        'server_us' => 'us.example.com',
        'server_gb' => 'gb.example.com',
        'server_bf' => 'bf.example.com',
    );

    private $mapping = array(
        'NA' => 'server_us',
        'EU' => 'server_gb',
        'AF' => 'server_bf',
    );

    private $overrides = array(
        'ES' => 'server_us',
        'EG' => 'server_gb',
    );

    private $reasons = array(
        'A' => 'Got expected market',
        'B' => 'Got override country',
        'C' => 'Unexpected market',
    );

    private $ttl = 20;

    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);

        foreach ($this->reasons as $code => $explanation)
        {
            $config->declareReasonCode($code);
        }

        foreach ($this->servers as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     */
    public function service($request,$response,$utilities)
    {
        $market = $request->geo(GeoProperties::MARKET);
        $country = $request->geo(GeoProperties::COUNTRY);
        if (array_key_exists($country, $this->overrides))
        {
            $response->setReasonCode('B');
            $response->selectProvider($this->overrides[$country]);
            return;
        }
        if (array_key_exists($market, $this->mapping))
        {
            $response->setReasonCode('A');
            $response->selectProvider($this->mapping[$market]);
            return;
        }

        $response->setReasonCode('C');
        $utilities->selectRandom();
    }
}
?>
