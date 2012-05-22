<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {
        $config = $this->getMock('Configuration');
        
        $config->expects($this->at(0))
            ->method('declareResponseOption')
            ->with('cdn1', 'www.example.coolcdn.com', 20);
            
        $config->expects($this->at(1))
            ->method('declareResponseOption')
            ->with('cdn2', 'www.example.awesomecdn.com', 20);
            
        $config->expects($this->at(2))
            ->method('declareResponseOption')
            ->with('cdn3', 'www.example.excellentcdn.com', 20);
        
        $config->expects($this->at(3))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'cdn1,cdn2,cdn3');
            
        $config->expects($this->at(4))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2,cdn3');
            
        $config->expects($this->at(5))
            ->method('declareReasonCode')
            ->with('A');
            
        $config->expects($this->at(6))
            ->method('declareReasonCode')
            ->with('B');
            
        $config->expects($this->at(7))
            ->method('declareReasonCode')
            ->with('C');
            
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // no servers overloaded, cdn1 fastest
            array(
                'pulse' => array('cdn1' => 99, 'cdn2' => 99, 'cdn3' => 99),
                'rtt' => array('cdn1' => 199, 'cdn2' => 200, 'cdn3' => 200),
                'alias' => 'cdn1',
                'reason' => 'A'
            ),
            // cdn1 fastest but overloaded, cdn2 next fastest
            array(
                'pulse' => array('cdn1' => 100, 'cdn2' => 99, 'cdn3' => 99),
                'rtt' => array('cdn1' => 199, 'cdn2' => 200, 'cdn3' => 201),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            // cdn1 fastest but overloaded, cdn3 next fastest
            array(
                'pulse' => array('cdn1' => 100, 'cdn2' => 99, 'cdn3' => 99),
                'rtt' => array('cdn1' => 199, 'cdn2' => 201, 'cdn3' => 200),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            // all servers overloaded, cdn1 fastest
            array(
                'pulse' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'rtt' => array('cdn1' => 199, 'cdn2' => 200, 'cdn3' => 200),
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
            // only cdn3 not overloaded; select even though slowest
            array(
                'pulse' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 99),
                'rtt' => array('cdn1' => 199, 'cdn2' => 199, 'cdn3' => 200),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            // missing Pulse Load data
            array(
                'pulse' => null,
                'rtt' => array('origin' => 200, 'cdn1' => 200),
                'reason' => 'C'
            ),
            // missing RTT data
            array(
                'pulse' => array('cdn1' => '1999'),
                'rtt' => null,
                'reason' => 'C'
            )
        );
        
        $testIdx = 0;
        
        foreach ($testData as $i)
        {
            //print("\nTest: " . $testIdx++);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $requestCallIdx = 0;
            $request->expects($this->at($requestCallIdx++))
                ->method('pulse')
                ->with(PulseProperties::LOAD)
                ->will($this->returnValue($i['pulse']));
                
            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($requestCallIdx++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }
            
            if (array_key_exists('alias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
                    
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
                ->with($i['reason']);
            
            $application = new OpenmixApplication();
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>