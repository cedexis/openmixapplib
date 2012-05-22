<?php

/**
 * Demonstrates the basic use of performance and geographic data.
 * Use Radar data for most decisions, use Geo data if Radar data is missing.
 */
class OpenmixApplication implements Lifecycle
{
    # The keys in this array are the platform names as defined in the portal.
    # The values are the CNAMEs Openmix will return when this application
    # is called.
    private $platforms = array(
        'server_us' => 'us.example.com',
        'server_gb' => 'gb.example.com',
        'server_af' => 'af.example.com',
    );

    /*
     * Each market is mapped to a platform name.
     * +------+---------------+
     * | Code | Market        |
     * +======+===============+
     * | NA   | North America |
     * +------+---------------+
     * | OC   | Oceania       |
     * +------+---------------+
     * | EU   | Europe        |
     * +------+---------------+
     * | AS   | Asia          |
     * +------+---------------+
     * | AF   | Africa        |
     * +------+---------------+
     * | SA   | South America |
     * +------+---------------+
    */
    private $mapping = array(
        'NA' => 'server_us',
        'OC' => 'server_us',
        'EU' => 'server_gb',
        'AS' => 'server_gb',
        'AF' => 'server_af',
        'SA' => 'server_us',
    );

    # These are optional.
    private $overrides = array(
        # ES (Spain) would default to the EU server.
        'ES' => 'server_us',
        # GB (Great Britain) would also default to the EU server.
        'GB' => 'server_af',
    );

    # If the platform isn't this available it won't be considered for
    # RTT performance based routing.
    private $availabilityThreshold = 90;

    private $reasons = array(
        'A' => 'Performance based route',
        'B' => 'Market based decision',
        'C' => 'Country override based decision',
        'D' => 'GEO unknown market',
    );

    private $ttl = 20;

    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(GeoProperties::MARKET);
        $config->declareInput(GeoProperties::COUNTRY);
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->platforms)));
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->platforms)));


        foreach ($this->reasons as $code => $explanation)
        {
            $config->declareReasonCode($code);
        }

        foreach ($this->platforms as $alias => $cname)
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
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        $availables = $request->radar(RadarProbeTypes::AVAILABILITY);


        #error_log("market: $market, country: $country");


        if (
            is_array($rtt) && is_array($availables) &&
            # Only use perf if there is rtt and availaility 
            # data for all platforms.
            (count($rtt) == count(array_keys($this->platforms))) &&
            (count($availables) == count(array_keys($this->platforms)))
        ) {
            # Test for availability.
            $available_platforms = array();
            foreach (array_keys($this->platforms) as $platform_name)
            {
                if ($availables[$platform_name] >= $this->availabilityThreshold)
                {
                    $available_platforms[$platform_name] = 1;
                }
            }
            # filter to only available ones.
            $available_rtt = array_intersect_key($rtt, $available_platforms);
            # If there are none acceptably available, default to geo data.
            if (count(array_keys($available_rtt)) != 0) {
                # Choose the best one.
                asort($available_rtt); # This sorts the array _in place_.
                #error_log("'" . print_r($available_rtt, TRUE) . "'");
                $response->selectProvider( key($available_rtt) );
                $response->setReasonCode('A');
                return;
            }
        }

        # Not using performance data because it is unavailable.
        # This also implies we likely don't have availability data for all
        # platforms, because that is also Radar based.
        # This is not the same thing as not being available.
        # Therefore availability data is not combined with the geo data here.
        if (array_key_exists($country, $this->overrides))
        {
            $response->setReasonCode('C');
            $response->selectProvider($this->overrides[$country]);
            return;
        }
        if (array_key_exists($market, $this->mapping))
        {
            $response->setReasonCode('B');
            $response->selectProvider($this->mapping[$market]);
            return;
        }

        $response->setReasonCode('D');
        $utilities->selectRandom();
    }
}
?>
