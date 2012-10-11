<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests  extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {
        $providers = array(
            'provider1' => 'provider1.example.com',
            'provider2' => 'provider2.example.com',
            'provider3' => 'provider3.example.com');
        
        $reasons = array('A', 'B', 'C');
        
        $config = $this->getMock('Configuration');
        $callIndex = 0;
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'provider1,provider2,provider3');
            
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'provider1,provider2,provider3');
            
        foreach ($providers as $alias => $cname)
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
            // all are above avail threshold and provider1 is fastest after handicap
            array(
                'rtt' => array('provider1' => 150, 'provider2' => 141, 'provider3' => 141),
                'avail' => array('provider1' => 100, 'provider2' => 100, 'provider3' => 100),
                'expectedAlias' => 'provider1',
                'expectedReasonCode' => 'A'
            ),
            // all are above avail threshold and provider2 is fastest after handicap
            array(
                'rtt' => array('provider1' => 200, 'provider2' => 139, 'provider3' => 161),
                'avail' => array('provider1' => 100, 'provider2' => 100, 'provider3' => 100),
                'expectedAlias' => 'provider2',
                'expectedReasonCode' => 'A'
            ),
            // all are below avail threshold; provider1 is most available
            array(
                'rtt' => array('provider1' => 0, 'provider2' => 0, 'provider3' => 0),
                'avail' => array('provider1' => 89, 'provider2' => 88, 'provider3' => 88),
                'expectedAlias' => 'provider1',
                'expectedReasonCode' => 'C'
            ),
        );

        $test = 0;
        foreach ($testData as $i)
        {
            //print("\nTest: " . $test++ . "\n");
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
                    
                $utilities->expects($this->never())
                    ->method('selectRandom');
            }
            else
            {
                $utilities->expects($this->once())
                    ->method('selectRandom');
                    
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
