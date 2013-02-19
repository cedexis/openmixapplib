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
            // 0: All are above threshold and eu-west is the clear winner
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 320, 'amazon_ec2___asia_se__singapore__1a' => 400),
                //'get_key' => 'NA-US-7922',
                'expectedAlias' => 'amazon_ec2___eu_west_1a',
                'expectedReasonCode' => 'A'
            ),
            // 1: All are above threshold and eu-west and tokyo tie - hash of key points to eu-west   
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 400),
                'get_key' => '7922', // NA-US hash is 51
                'expectedAlias' => 'amazon_ec2___eu_west_1a',
                'expectedReasonCode' => 'B'
            ),
            // 2: All are above threshold and there is a 3 way tie - hash of key points to tokyo  
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '3215', //EU-FR
                'expectedAlias' => 'amazon_ec2___asia_ne__tokyo__1a',
                'expectedReasonCode' => 'B'
            ),
            // 3: All are above threshold and there is a 3 way tie - hash of key points to tokyo   
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '19262', //NA-US 
                'expectedAlias' => 'amazon_ec2___asia_ne__tokyo__1a',
                'expectedReasonCode' => 'B'
            ),
            // 4: All are above threshold and there is a 3 way tie - hash of key points to eu-west  
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '3356', //NA-US toend
                'expectedAlias' => 'amazon_ec2___eu_west_1a',
                'expectedReasonCode' => 'B'
            ),
            // 5: All are above threshold and there is a 3 way tie - hash of key points to eu-west  
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '10796', 
                'expectedAlias' => 'amazon_ec2___eu_west_1a',
                'expectedReasonCode' => 'B'
            ),
            // 6: All are above threshold and there is a 3 way tie - hash of key points to tokyo  
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '11351', 
                'expectedAlias' => 'amazon_ec2___asia_ne__tokyo__1a',
                'expectedReasonCode' => 'B'
            ),
            // 7: All are above threshold  except eu-west - hash of key points to singapore 
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 83, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '23148', 
                'expectedAlias' => 'amazon_ec2___asia_se__singapore__1a',
                'expectedReasonCode' => 'B'
            ),
            // 8: none are above avail threshold, choose least bad
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 100, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 83, 'amazon_ec2___us_east_1a' => 70, 'amazon_ec2___us_west__or__2a' => 84, 'amazon_ec2___asia_ne__tokyo__1a' => 10, 'amazon_ec2___asia_se__singapore__1a' => 0),
                //'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 200, 'amazon_ec2___us_west__or__2a' => 250, 'amazon_ec2___asia_ne__tokyo__1a' => 120, 'amazon_ec2___asia_se__singapore__1a' => 101),
                //'get_key' => '23148', 
                'expectedAlias' => 'amazon_ec2___us_west__or__2a',
                'expectedReasonCode' => 'D'
            ),
            // 9: Sonar sees us-west as down, choose from among singapore and and tokyo which are tied after dc3's removal
            array(
                'sonar' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 100, 'amazon_ec2___us_west__or__2a' => 0, 'amazon_ec2___asia_ne__tokyo__1a' => 100, 'amazon_ec2___asia_se__singapore__1a' => 100),
                'availability' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 99, 'amazon_ec2___us_west__or__2a' => 20, 'amazon_ec2___asia_ne__tokyo__1a' => 95, 'amazon_ec2___asia_se__singapore__1a' => 90),
                'rtt' => array('amazon_ec2___eu_west_1a' => 300, 'amazon_ec2___us_east_1a' => 400, 'amazon_ec2___us_west__or__2a' => 300, 'amazon_ec2___asia_ne__tokyo__1a' => 99, 'amazon_ec2___asia_se__singapore__1a' => 101),
                'get_key' => '9930', 
                'expectedAlias' => 'amazon_ec2___asia_ne__tokyo__1a',
                'expectedReasonCode' => 'B'
            ),
        );

        $test = 0;
        foreach ($testData as $i)
        {
            print("\n*********\nTest: " . $test++ . "\n");
          
            $config = $this->getMock('Configuration');
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $app = $this->getMock('OpenmixApplication', array('get_key'));

            $reqCallIndex = 0;
            $appCallIndex = 0;
            // Mock Sonar data call
            $request->expects($this->at($reqCallIndex ++))
                ->method('pulse')
                ->with(PulseProperties::SONAR)
                ->will($this->returnValue($i['sonar']));

            // Mock Radar data call
            $request->expects($this->at($reqCallIndex ++))
                ->method('radar')
                ->with(RadarProbeTypes::AVAILABILITY)
                ->will($this->returnValue($i['availability']));
                
            // Mock Radar data call
            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($reqCallIndex ++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }

            // Mock get_key
            if (array_key_exists('get_key', $i))
            {
                $app->expects($this->any())
                    ->method('get_key')
                    ->will($this->returnValue($i['get_key']));
            } else {
                $app->expects($this->never())
                ->method('get_key');
            }
            
            if ($i['expectedAlias'] == '') {
                $response->expects($this->once())
                    ->method('selectProvider');
            }
            else {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['expectedAlias']);
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['expectedReasonCode']);

            $app->init($config);
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>
