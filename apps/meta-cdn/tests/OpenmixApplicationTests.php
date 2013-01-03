<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests extends PHPUnit_Framework_TestCase
{
    private $sample_config = array(
        'cdn1' =>
            "#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
    );
    
    /**
     * @test
     */
    public function init()
    {
        $config = $this->getMock('Configuration');
        
        $call_index = 0;
        
        $config->expects($this->exactly(4))->method('declareInput');
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RequestProperties::HOSTNAME);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'cdn1');
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2,cdn3');
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'cdn1,cdn2,cdn3');
        
        $config->expects($this->exactly(3))->method('declareResponseOption');
        
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('cdn1', 'provider1.example.com', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('cdn2', 'provider2.example.com', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('cdn3', 'provider3.example.com', 20);
            
        $config->expects($this->exactly(3))->method('declareReasonCode');
        
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('A');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('B');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('C');
        
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $request = $this->getMock('Request');
        $response = $this->getMock('Response');
        $utilities = $this->getMock('Utilities');
        
        $call_index = 0;
        $request->expects($this->at($call_index++))
            ->method('request')
            ->with(RequestProperties::HOSTNAME)
            ->will($this->returnValue('site1'));
            
        
        $request->expects($this->at($call_index++))
            ->method('pulse')
            ->with(PulseProperties::LOAD)
            ->will($this->returnValue($this->sample_config));
            
        $request->expects($this->at($call_index++))
            ->method('radar')
            ->with(RadarProbeTypes::HTTP_RTT)
            ->will($this->returnValue(
                array(
                    'cdn1' => 200,
                    'cdn2' => 200,
                    'cdn3' => 200,
                )));
            
        $request->expects($this->at($call_index++))
            ->method('radar')
            ->with(RadarProbeTypes::AVAILABILITY)
            ->will($this->returnValue(
                array(
                    'cdn1' => 100,
                    'cdn2' => 100,
                    'cdn3' => 100,
                )));
        
        $application = new OpenmixApplication();
        $application->service($request, $response, $utilities);
    }
}

?>