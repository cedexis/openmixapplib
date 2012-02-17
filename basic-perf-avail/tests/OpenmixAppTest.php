<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/PerformancesAndAvailabilityThreshold.php');

class OpenmixApplicationTests  extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {

        $servers = array(
            'origin' => 'origin.customer.net',
            'thiscdn' => 'www.customer.net.thiscdn.net');

        $reasons = array('A', 'B', 'C');

        $config = $this->getMock('Configuration');

        $callIndex = 0;

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'origin,thiscdn');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'origin,thiscdn');

        foreach ($servers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
        }

        foreach ($reasons as $code)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareReasonCode')
                ->with($code);
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
            //both are above avail threshold and origin is fastest
            array(
                'rtt' => array('origin' => 201, 'thiscdn' => 202),
                'avail' => array('origin' => 100, 'thiscdn' => 100),
                'expectedAlias' => 'origin',
                'expectedTTL' => 20,
                'expectedReasonCode' => 'A'
            ),
            // both are available and thiscdn is fastest
            array(
                'rtt' => array('origin' => 202, 'thiscdn' => 201),
                'avail' => array('origin' => 100, 'thiscdn' => 100),
                'expectedAlias' => 'thiscdn',
                'expectedTTL' => 20,
                'expectedReasonCode' => 'A'
            ),
            // thiscdn excluded due to availability so we choose origin even though thiscdn is faster
            array(
                'rtt' => array('origin' => 208, 'thiscdn' => 200),
                'avail' => array('origin' => 100, 'thiscdn' => 88),
                'expectedAlias' => 'origin',
                'expectedTTL' => 20,
                'expectedReasonCode' => 'A'
            ),
            // both are below the availability threshold so choose the most available even if slower
            array(
                'rtt' => array('origin' => 208, 'thiscdn' => 299),
                'avail' => array('origin' => 55, 'thiscdn' => 61),
                'expectedAlias' => 'thiscdn',
                'expectedTTL' => 20,
                'expectedReasonCode' => 'C'
            ),
            // Data problems
            array(
                'rtt' => array(),
                'expectedReasonCode' => 'B'
            ),
            array(
                'rtt' => 'something not an array',
                'expectedReasonCode' => 'B'
            )
        );

        $test=0;
        foreach ($testData as $i)
        {
            print("\nTest: " . $test++ . "\n");

            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $reqCallIndex = 0;

            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }

            
            if (array_key_exists('avail', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::AVAILABILITY)
                    ->will($this->returnValue($i['avail']));
            }
                
            if (array_key_exists('expectedAlias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['expectedAlias']);
            }
            else
            {
                $response->expects($this->never())
                    ->method('selectProvider');
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['expectedReasonCode']);
            
            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }

     }
}

?>
