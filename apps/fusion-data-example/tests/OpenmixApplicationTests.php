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
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            array(
                'provider' => 'fusion_example',
                'fusion_data_gb' => array('fusion_example' => 100),
                'fusion_data_mbps' => array('fusion_example' => 75),
                'expectedAlias' => '100.75'
            ),
            array(
                'provider' => 'fusion_example',
                'fusion_data_gb' => array('fusion_example' => 999),
                'fusion_data_mbps' => array('fusion_example' => 888),
                'expectedAlias' => '999.888'
            ),
            array(
                'provider' => 'fusion_example',
                'fusion_data_gb' => array('fusion_example' => 0),
                'fusion_data_mbps' => array('fusion_example' => 0),
                'expectedAlias' => '0.0'
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
            // Mock Fusion data call
            $request->expects($this->at($reqCallIndex++))
                ->method('fusion')
                ->with(FusionProperties::GB)
                ->will($this->returnValue($i['fusion_data_gb']));
            $request->expects($this->at($reqCallIndex++))
                ->method('fusion')
                ->with(FusionProperties::MBPS)
                ->will($this->returnValue($i['fusion_data_mbps']));
            
            if (array_key_exists('expectedAlias', $i)) {
                $response->expects($this->once())
                    ->method('respond')
                    ->with($i['provider'], $i['fusion_data_gb']['fusion_example'] . "-" . $i['fusion_data_mbps']['fusion_example']); //$i['expectedAlias']);
            }
            
            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }        
    }
}

?>
