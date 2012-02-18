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
        $servers = array(
            'cdn1' => 'www.example.com.cdn1.net',
            'cdn2' => 'cdn.example.com.cdn2.net',
            'cdn3' => 'origin.example.com');
        
        $reasons = array('A', 'B', 'C');
        
        $config = $this->getMock('Configuration');
        
        $callIndex = 0;
        
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2,cdn3');
            
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'cdn1,cdn2,cdn3');
            
        foreach ($servers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 30);
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
            // all are available and cdn1 is fastest
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn1',
                'reason' => 'A'
            ),
            // all are available and cdn2 is fastest
            array(
                'rtt' => array('cdn1' => 202, 'cdn2' => 201, 'cdn3' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            // all are available and cdn3 is fastest
            array(
                'rtt' => array('cdn1' => 202, 'cdn2' => 202, 'cdn3' => 171),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            // cdn1 excluded due to availability, cdn2 next fastest despite penalty
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 203),
                'avail' => array('cdn1' => 89, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            // none available, choose randomly
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 202),
                'avail' => array('cdn1' => 89, 'cdn2' => 89, 'cdn3' => 89),
                'reason' => 'C'
            ),
            // Data problems
            array(
                'rtt' => array(),
                'reason' => 'B'
            ),
            array(
                'rtt' => 'something not an array',
                'reason' => 'B'
            )
        );

        $test=0;
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
                
            if (array_key_exists('alias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
            }
            else
            {
                $response->expects($this->never())
                    ->method('selectProvider');
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }

     }
}

?>
