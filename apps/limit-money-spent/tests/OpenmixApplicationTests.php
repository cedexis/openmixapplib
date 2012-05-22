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
            ->with('origin', 'www.example.com', 20);
            
        $config->expects($this->at(1))
            ->method('declareResponseOption')
            ->with('cdn1', 'www.example.somecdn.com', 20);
        
        $config->expects($this->at(2))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'origin,cdn1');
            
        $config->expects($this->at(3))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'origin,cdn1');
            
        $config->expects($this->at(4))
            ->method('declareReasonCode')
            ->with('A');
            
        $config->expects($this->at(5))
            ->method('declareReasonCode')
            ->with('B');
            
        $config->expects($this->at(6))
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
            // select origin because it's faster
            array(
                'pulse' => array('cdn1' => '1999'),
                'rtt' => array('origin' => 199, 'cdn1' => 200),
                'alias' => 'origin',
                'reason' => 'A'
            ),
            // select cdn1 because it's faster
            array(
                'pulse' => array('cdn1' => '1999'),
                'rtt' => array('origin' => 200, 'cdn1' => 199),
                'alias' => 'cdn1',
                'reason' => 'A'
            ),
            // select origin, even though cdn1 is faster
            array(
                'pulse' => array('cdn1' => '2000'),
                'rtt' => array('origin' => 200, 'cdn1' => 199),
                'alias' => 'origin',
                'reason' => 'B'
            ),
            // select origin; it's faster anyway
            array(
                'pulse' => array('cdn1' => '2000'),
                'rtt' => array('origin' => 199, 'cdn1' => 200),
                'alias' => 'origin',
                'reason' => 'B'
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