<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests extends PHPUnit_Framework_TestCase
{
    private $sample_config = array(
        'cdn1' =>
            "#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
    );
    
    private $bad_config = array(
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
            ->with('cdn1', 'tobeoverwritten', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('cdn2', 'tobeoverwritten', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('cdn3', 'tobeoverwritten', 20);
            
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
        $testData = array(
            // 0: all are available and cdn1 is fastest
            array(
                'hostname' => 'site1',
                'config' => $this->sample_config,
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn1',
                'reason' => 'A'
            ),
            // 1: all are available and cdn2 is fastest
            array(
                'hostname' => 'site1',
                'config' => $this->sample_config,
                'rtt' => array('cdn1' => 202, 'cdn2' => 201, 'cdn3' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            // 2: all are available and cdn3 is fastest
            array(
                'hostname' => 'site2',
                'config' => $this->sample_config,
                'rtt' => array('cdn1' => 202, 'cdn2' => 202, 'cdn3' => 171),
                'avail' => array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            // 3: cdn1 excluded due to availability, cdn2 next fastest despite penalty
            array(
                'hostname' => 'site2',
                'config' => $this->sample_config,
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 203),
                'avail' => array('cdn1' => 79, 'cdn2' => 100, 'cdn3' => 100),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            // 4: none available, choose least bad
            array(
                'hostname' => 'site1',
                'config' => $this->sample_config,
                'rtt' => array('cdn1' => 201, 'cdn2' => 202, 'cdn3' => 202),
                'avail' => array('cdn1' => 79, 'cdn2' => 69, 'cdn3' => 59),
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
            // 5: Data problems
            array(
                'hostname' => 'site1',
                'config' => $this->bad_config,
                'alias' => 'cdn1',
                'reason' => 'C'
            ),
            // 6:
            array(
                'hostname' => 'site1',
                'config' => $this->sample_config,
                'rtt' => array(),
                //'avail' => array(),
                'alias' => 'cdn1',
                'reason' => 'C'
            ),
            // 7:
            array(
                'hostname' => 'site1',
                'config' => $this->sample_config,
                'rtt' => 'something not an array',
                'alias' => 'cdn1',
                'reason' => 'C'
            ),
            // 8: site not listed in config, skip to fallback
            array(
                'hostname' => 'site4',
                'config' => $this->sample_config,
                'alias' => 'cdn1',
                'reason' => 'C'
            )
        );

        $test=0;
        foreach ($testData as $i)
        {
            print "\nTest Number: $test\n";
            $test++;
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $call_index = 0;
            if (array_key_exists('hostname', $i))
            {
                $request->expects($this->at($call_index++))
                    ->method('request')
                    ->with(RequestProperties::HOSTNAME)
                    ->will($this->returnValue($i['hostname']));
            }
                
            if (array_key_exists('config', $i))
            {
                $request->expects($this->at($call_index++))
                    ->method('pulse')
                    ->with(PulseProperties::LOAD)
                    ->will($this->returnValue($i['config']));
            }
                
            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($call_index++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }
            
            if (array_key_exists('avail', $i))
            {
                $request->expects($this->at($call_index++))
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
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with('cdn1');
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            $application = new OpenmixApplication();
            $application->service($request, $response, $utilities);
        }
    }
}

?>