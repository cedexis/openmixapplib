<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class Geo_Market extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {
        $servers = array(
            'server_us' => 'us.example.com',
            'server_gb' => 'gb.example.com',
            'server_af' => 'af.example.com',
        );

        #$reasons = array('A', 'B', 'C', 'D');
        # Needs to be in this order because... ?
        $reasons = array('A', 'B', 'C','D');

        $config = $this->getMock('Configuration');

        $callIndex = 0;

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(GeoProperties::MARKET);
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(GeoProperties::COUNTRY);
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT);
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY);

        foreach ($reasons as $code)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareReasonCode')
                ->with($code);
        }

        foreach ($servers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
        }

        $app = new OpenmixApplication();
        $app->init($config);
    }

    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            # These tests have no or not enough radar data.
            # They should always return geo-based decisions.
            array(
                'market' => 'NA',
                'country' => 'US',
                'rtt' => array(
                   'server_us' => 100, 'server_af' => 100, 'server_gb' => 100
                ),
                'availability' => array('server_us' => 100),
                'expectedPlatform' => 'server_us',
                # No override: use market.
                'expectedReasonCode' => 'B',
            ),
            array(
                'market' => 'EU',
                'country' => 'RU',
                'rtt' => array(),
                'availability' => array(),
                'expectedPlatform' => 'server_gb',
                # No override: use market.
                'expectedReasonCode' => 'B',
            ),
            array(
                'market' => 'AF',
                'country' => 'ZA',
                'rtt' => array(),
                'availability' => array(),
                'expectedPlatform' => 'server_af',
                # No override: use market.
                'expectedReasonCode' => 'B',
            ),
            array(
                'market' => 'EU',
                'country' => 'ES',
                'rtt' => array(),
                'availability' => array(),
                'expectedPlatform' => 'server_us',
                # Override: use country.
                'expectedReasonCode' => 'C',
            ),
            array(
                'market' => 'EU',
                'country' => 'GB',
                'rtt' => array(),
                'availability' => array(),
                'expectedPlatform' => 'server_af',
                # Override: use country.
                'expectedReasonCode' => 'C',
            ),
            array(
                'market' => 'some market',
                'country' => 'some country',
                'rtt' => array(),
                'availability' => array(),
                # Unknown. Use random, set 'unknown' reason.
                'expectedReasonCode' => 'D',
            ),
            # These should use perf data.
            array(
                'market' => 'EU',
                'country' => 'RO',
                # We have rtt, but..
                'rtt' => array(
                     'server_us' => 50, 'server_gb' => 50, 'server_af' => 50
                ),
                # Availability count is not what we expect. Use geo data.
                'availability' => array(
                     'server_us' => 100, 'server_gb' => 50, 'server_af' => 50,
                     'server_oc' => 100
                ),
                'expectedPlatform' => 'server_gb',
                'expectedReasonCode' => 'B',
            ),
            array(
                'market' => 'EU',
                'country' => 'FR',
                # We have rtt, but..
                'rtt' => array(
                     'server_us' => 50, 'server_gb' => 50, 'server_af' => 50
                ),
                # Bad availability. Therefore we should default to geo data.
                'availability' => array(
                     'server_us' => 50, 'server_gb' => 50, 'server_af' => 50
                ),
                'expectedPlatform' => 'server_gb',
                'expectedReasonCode' => 'B',
            ),
            array(
                'market' => 'EU',
                'country' => 'IT',
                # We have rtt, and AF looks bad but..
                'rtt' => array(
                     'server_us' => 50, 'server_gb' => 50, 'server_af' => 1000 
                ),
                # at least it's available. use it.
                'availability' => array(
                     'server_us' => 50, 'server_gb' => 50, 'server_af' => 100
                ),
                'expectedPlatform' => 'server_af',
                # A: performance based.
                'expectedReasonCode' => 'A',
            ),
            array(
                'market' => 'EU',
                'country' => 'GB',
                # We have rtt. Use lowest
                'rtt' => array(
                     'server_us' => 10, 'server_gb' => 50, 'server_af' => 1000 
                ),
                # ..because all are acceptably available.
                'availability' => array(
                     'server_us' => 95, 'server_gb' => 100, 'server_af' => 100
                ),
                'expectedPlatform' => 'server_us',
                'expectedReasonCode' => 'A',
            ),
        );

        $test = 1;
        foreach ($testData as $i)
        {
            //print("\nTest: " . $test++ ."\n");
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');

             $request->expects($this->at(0))
                ->method('geo')
                ->with(GeoProperties::MARKET)
                ->will($this->returnValue($i['market']));


             $request->expects($this->at(1))
                ->method('geo')
                ->with(GeoProperties::COUNTRY)
                ->will($this->returnValue($i['country']));


             $request->expects($this->at(2))
                ->method('radar')
                ->with(RadarProbeTypes::HTTP_RTT)
                ->will($this->returnValue($i['rtt']));


             $request->expects($this->at(3))
                ->method('radar')
                ->with(RadarProbeTypes::AVAILABILITY)
                ->will($this->returnValue($i['availability']));

            if (array_key_exists('expectedPlatform', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['expectedPlatform']);
                $utilities->expects($this->never())
                    ->method('selectRandom');
            }
            else
            {
                # Random should be used if we didn't specify a provider
                # in the test. Otherwise it is a failure.
                $utilities->expects($this->once())
                    ->method('selectRandom');
            }

            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>
