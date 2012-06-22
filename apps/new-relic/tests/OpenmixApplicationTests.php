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
            ->with('datacenter_a', 'datacenter_a.example.com', 20);
            
        $config->expects($this->at(1))
            ->method('declareResponseOption')
            ->with('datacenter_b', 'datacenter_b.example.com', 20);
            
        $config->expects($this->at(2))
            ->method('declareInput')
            ->with(NewrelicProperties::CPU, 'datacenter_a');
        
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // datacenter_a not overloaded
            array('newrelic' => array('datacenter_a' => 0.0)),
            array('newrelic' => array('datacenter_a' => 0.04)),
            array('newrelic' => array('datacenter_a' => 0.1)),
            array('newrelic' => array('datacenter_a' => 0.99)),
            // datacenter_a overloaded
            array(
                'newrelic' => array('datacenter_a' => 1.01),
                'alias' => 'datacenter_b'
            ),
            array(
                'newrelic' => array('datacenter_a' => 3.2),
                'alias' => 'datacenter_b'
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
                ->method('newrelic')
                ->with(NewrelicProperties::CPU)
                ->will($this->returnValue($i['newrelic']));
                
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
