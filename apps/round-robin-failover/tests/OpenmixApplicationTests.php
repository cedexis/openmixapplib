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
        $application = new OpenmixApplication();
        
        $application->set_primary_providers(
            array(
                'a' => 'a.foo.com',
                'b' => 'b.foo.com',
            )
        );
        
        $application->set_failover_providers(
            array(
                'c' => 'c.foo.com',
                'd' => 'd.foo.com'
            )
        );
        
        $application->set_ttl(123);
        
        $config_call_index = 0;
        $config->expects($this->exactly(1))->method('declareInput');
        $config->expects($this->at($config_call_index++))
            ->method('declareInput')
            ->with('real:plive:live', 'a,b,c,d');
            
        $config->expects($this->exactly(3))->method('declareReasonCode');
        $config->expects($this->at($config_call_index++))
            ->method('declareReasonCode')
            ->with('A');
            
        $config->expects($this->at($config_call_index++))
            ->method('declareReasonCode')
            ->with('B');
            
        $config->expects($this->at($config_call_index++))
            ->method('declareReasonCode')
            ->with('C');
        
        $config->expects($this->exactly(4))->method('declareResponseOption');
        $config->expects($this->at($config_call_index++))
            ->method('declareResponseOption')
            ->with('a', 'a.foo.com', 123);
            
        $config->expects($this->at($config_call_index++))
            ->method('declareResponseOption')
            ->with('b', 'b.foo.com', 123);
            
        $config->expects($this->at($config_call_index++))
            ->method('declareResponseOption')
            ->with('c', 'c.foo.com', 123);
            
        $config->expects($this->at($config_call_index++))
            ->method('declareResponseOption')
            ->with('d', 'd.foo.com', 123);
        
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $test_data = array(
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 90, 'b' => 90, 'c' => 90, 'd' => 90 ),
                'get_rand' => array(
                    array(0, 1, 0)
                ),
                'alias' => 'a',
                'reason' => 'A'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 90, 'b' => 90, 'c' => 90, 'd' => 90 ),
                'get_rand' => array(
                    array(0, 1, 1)
                ),
                'alias' => 'b',
                'reason' => 'A'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 89, 'b' => 90, 'c' => 90, 'd' => 90 ),
                'get_rand' => array(),
                'alias' => 'b',
                'reason' => 'A'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 90, 'b' => 89, 'c' => 90, 'd' => 90 ),
                'get_rand' => array(),
                'alias' => 'a',
                'reason' => 'A'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 89, 'b' => 89, 'c' => 90, 'd' => 90 ),
                'get_rand' => array(
                    array(0, 1, 0)
                ),
                'alias' => 'c',
                'reason' => 'B'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 89, 'b' => 89, 'c' => 90, 'd' => 89 ),
                'get_rand' => array(),
                'alias' => 'c',
                'reason' => 'B'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 89, 'b' => 89, 'c' => 89, 'd' => 90 ),
                'get_rand' => array(),
                'alias' => 'd',
                'reason' => 'B'
            ),
            array(
                'threshold' => 90,
                'primary' => array( 'a' => 'a.example.com', 'b' => 'b.example.com' ),
                'failover' => array( 'c' => 'c.example.com', 'd' => 'd.example.com' ),
                'default' => 'a',
                'sonar' => array( 'a' => 89, 'b' => 89, 'c' => 89, 'd' => 89 ),
                'get_rand' => array(),
                'alias' => 'a',
                'reason' => 'C'
            )
        );
        
        $test_index = 0;
        foreach ($test_data as $i) {
            if (array_key_exists('description', $i)) { print("\nTest " . $test_index++ . ': ' + $i['description']); }
            else { print("\nTest " . $test_index++); }
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('get_rand'));
            
            $application->set_sonar_threshold($i['threshold']);
            $application->set_primary_providers($i['primary']);
            $application->set_failover_providers($i['failover']);
            $application->set_default_provider($i['default']);
            
            $request_call_index = 0;
            $request->expects($this->at($request_call_index++))
                ->method('pulse')
                ->with('real:plive:live')
                ->will($this->returnValue($i['sonar']));
                
            $app_call_index = 0;
            foreach ($i['get_rand'] as $j) {
                $application->expects($this->at($app_call_index++))
                    ->method('get_rand')
                    ->with($j[0], $j[1])
                    ->will($this->returnValue($j[2]));
            }
            
            if (array_key_exists('alias', $i)) {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
            }
            else {
                $response->expects($this->never())
                    ->method('selectProvider');
            }
            
            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>