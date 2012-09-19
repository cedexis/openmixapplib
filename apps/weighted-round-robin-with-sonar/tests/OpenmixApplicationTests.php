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

        $providers = array(
        	'provider1' => 'cname1.foo.com',
            'provider2' => 'cname2.foo.com',
            'provider3' => 'cname3.foo.com'
            );
        
        $reasons = array(
            'A' => 'Routed randomly by weight',
            'B' => 'Most available platform chosen',
            'C' => 'Choose a random platform'
            );

        $config = $this->getMock('Configuration');
        $callIndex = 0;
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(PulseProperties::SONAR,
                   implode(',',array_keys($providers)));
            
        foreach ($providers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
        }
        
        foreach ($reasons as $code => $description)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareReasonCode')
                ->with($code);
        }
        
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // All are above Sonar threshold
            array(
                'sonar' => array('provider1' => 100, 'provider2' => 100, 'provider3' => 100),
                'weights' => array('provider1' => 50, 'provider2' => 30, 'provider3' => 20),
                'expectedAlias' => '',
                'expectedReasonCode' => 'A'
            ),
            // None are above Sonar threshold
            array(
                'sonar' => array('provider1' => 51, 'provider2' => 50, 'provider3' => 50),
                'weights' => array('provider1' => 50, 'provider2' => 30, 'provider3' => 20),
                'expectedAlias' => 'provider1',
                'expectedReasonCode' => 'B'
            ),
            // One is above Sonar threshold
            array(
                'sonar' => array('provider1' => 100, 'provider2' => 50, 'provider3' => 50),
                'weights' => array('provider1' => 50, 'provider2' => 30, 'provider3' => 20),
                'expectedAlias' => 'provider1',
                'expectedReasonCode' => 'A'
            ),
            // Two are above Sonar threshold
            array(
                'sonar' => array('provider1' => 100, 'provider2' => 100, 'provider3' => 50),
                'weights' => array('provider1' => 50, 'provider2' => 30, 'provider3' => 20),
                'expectedAlias' => '',
                'expectedReasonCode' => 'A'
            ),
            // No Sonar data
            array(
                'sonar' => '',
                'weights' => array('provider1' => 50, 'provider2' => 30, 'provider3' => 20),
                'expectedAlias' => '',
                'expectedReasonCode' => 'A'
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
            // Mock Sonar data call
            $request->expects($this->at($reqCallIndex++))
                ->method('pulse')
                ->with(PulseProperties::SONAR)
                ->will($this->returnValue($i['sonar']));
            
            if (array_key_exists('expectedAlias', $i)) {
                if ($i['expectedAlias'] == '') {
                    $response->expects($this->once())
                        ->method('selectProvider');
                }
                else {
                    $response->expects($this->once())
                        ->method('selectProvider')
                        ->with($i['expectedAlias']);
                }
                    
                $utilities->expects($this->never())
                    ->method('selectRandom');
            }
            else {
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
