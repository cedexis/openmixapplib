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
            ->with('softlayer_a', 'providerA.example.com');
            
        $config->expects($this->at(1))
            ->method('declareResponseOption')
            ->with('softlayer_b', 'providerB.example.com');
            
        $config->expects($this->at(2))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'softlayer_a');
        
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // softlayer_a not overloaded
            array('pulse' => array('softlayer_a' => "[{\n  \"frequency\": \"ONE_MIN\",\n  \"metricPath\": \"Application Infrastructure Performance|Trial Tier 1|JVM|Process CPU Burnt (ms/min)\",\n  \"metricValues\": [  {\n    \"current\": 160,\n    \"max\": 230,\n    \"min\": 130,\n    \"startTimeInMillis\": 1344373200000,\n    \"value\": 151\n  }]\n}]0")),
            array('pulse' => array('softlayer_a' => "[{\n  \"frequency\": \"ONE_MIN\",\n  \"metricPath\": \"Application Infrastructure Performance|Trial Tier 1|JVM|Process CPU Burnt (ms/min)\",\n  \"metricValues\": [  {\n    \"current\": 199,\n    \"max\": 230,\n    \"min\": 130,\n    \"startTimeInMillis\": 1344373200000,\n    \"value\": 151\n  }]\n}]0")),
            // softlayer_a overloaded
            array(
                'pulse' => array('softlayer_a' => "[{\n  \"frequency\": \"ONE_MIN\",\n  \"metricPath\": \"Application Infrastructure Performance|Trial Tier 1|JVM|Process CPU Burnt (ms/min)\",\n  \"metricValues\": [  {\n    \"current\": 200,\n    \"max\": 230,\n    \"min\": 130,\n    \"startTimeInMillis\": 1344373200000,\n    \"value\": 151\n  }]\n}]0"),
                'alias' => 'appdynamics_b'
            ),
            array(
                'pulse' => array('softlayer_a' => "[{\n  \"frequency\": \"ONE_MIN\",\n  \"metricPath\": \"Application Infrastructure Performance|Trial Tier 1|JVM|Process CPU Burnt (ms/min)\",\n  \"metricValues\": [  {\n    \"current\": 201,\n    \"max\": 230,\n    \"min\": 130,\n    \"startTimeInMillis\": 1344373200000,\n    \"value\": 151\n  }]\n}]0"),
                'alias' => 'appdynamics_b'
            )
        );
        
        $test = 0;
        foreach ($testData as $i)
        {
            print("\n\nTest " . $test++);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $request->expects($this->once())
                ->method('pulse')
                ->with(PulseProperties::LOAD)
                ->will($this->returnValue($i['pulse']));
                
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
            
            $application = new OpenmixApplication();
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>
