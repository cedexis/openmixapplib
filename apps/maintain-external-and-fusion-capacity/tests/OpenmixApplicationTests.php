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
        $platforms = array(
            'softlayer_ams' => array( 'cname' => 'sl_eu01.cedexis.com', 'padding' => 0),
            'ec2_us_east' => array( 'cname' => 'ec2_useast01.cedexis.com', 'padding' => 0),
            'ec2_us_west_ca' => array( 'cname' => 'ec2_uswestca01.cedexis.com', 'padding' => 0),
            'ec2_asia_se_singapore' => array( 'cname' => 'ec2_sin01.cedexis.com', 'padding' => 0)
        );
        $fallback = 'ec2_us_east';
        $multiplier = 2.0;
        $reasons = array('A', 'B', 'C', 'D');
        
        $config = $this->getMock('Configuration');
        
        $call_index = 0;
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'ec2_us_east');
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'softlayer_ams,ec2_us_east,ec2_us_west_ca,ec2_asia_se_singapore');

        foreach ($platforms as $alias => $data)
        {
            $config->expects($this->at($call_index++))
                ->method('declareResponseOption')
                ->with($alias, $data['cname'], 20);
        }
        foreach ($reasons as $code)
        {
            $config->expects($this->at($call_index++))
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
            // 0: all good and SL AMS is fastest
            array(
                'config' => array( 'ec2_us_east' => 'ec2_asia_se_singapore,sin01.cedexis.com,10
ec2_asia_se_singapore,sin02.cedexis.com,10
softlayer_ams,eu-sl01.cedexis.com,10
softlayer_ams,eu-sl02.cedexis.com,10
softlayer_ams,eu-sl03.cedexis.com,10
ec2_us_east,useastaws01.cedexis.com,10
ec2_us_east,useastaws02.cedexis.com,10
ec2_us_east,useastaws03.cedexis.com,10
ec2_us_west_ca,ec2_uswestor01.cedexis.com,10
ec2_us_west_ca,ec2_uswestor02.cedexis.com,10
ec2_us_west_ca,ec2_uswestor03.cedexis.com,10'
),
                'rtt' => array('softlayer_ams' => 100, 'ec2_us_east' => 175, 'ec2_asia_se_singapore' => 202, 'ec2_us_west_ca' => 300),
                'alias' => 'softlayer_ams',
                'cname' => 'eu-sl02.cedexis.com',
                'rand' => array(15),
                'randMax' => array(29),
                'reason' => 'A'
            ),
            // 1: all are good and Singapore is fastest
            array(
                'config' => array( 'ec2_us_east' => 'ec2_asia_se_singapore,sin01.cedexis.com,10
ec2_asia_se_singapore,sin02.cedexis.com,10
softlayer_ams,eu-sl01.cedexis.com,10
softlayer_ams,eu-sl02.cedexis.com,10
softlayer_ams,eu-sl03.cedexis.com,10
ec2_us_east,useastaws01.cedexis.com,10
ec2_us_east,useastaws02.cedexis.com,10
ec2_us_east,useastaws03.cedexis.com,10
ec2_us_west_ca,ec2_uswestor01.cedexis.com,10
ec2_us_west_ca,ec2_uswestor02.cedexis.com,10
ec2_us_west_ca,ec2_uswestor03.cedexis.com,10'
),
                'rtt' => array('softlayer_ams' => 300, 'ec2_us_east' => 202, 'ec2_asia_se_singapore' => 102, 'ec2_us_west_ca' => 400),
                'alias' => 'ec2_asia_se_singapore',
                'cname' => 'sin01.cedexis.com',
                'rand' => array(1),
                'randMax' => array(19),
                'reason' => 'A'
            ),
            // 2: Singapore is fastest but one destination is poor and the other at 80%, traffic shifts to US West
            array(
                'config' => array( 'ec2_us_east' => 'ec2_asia_se_singapore,sin01.cedexis.com,1
ec2_asia_se_singapore,sin02.cedexis.com,8
softlayer_ams,eu-sl01.cedexis.com,10
softlayer_ams,eu-sl02.cedexis.com,10
softlayer_ams,eu-sl03.cedexis.com,10
ec2_us_east,useastaws01.cedexis.com,10
ec2_us_east,useastaws02.cedexis.com,10
ec2_us_east,useastaws03.cedexis.com,10
ec2_us_west_ca,ec2_uswestor01.cedexis.com,10
ec2_us_west_ca,ec2_uswestor02.cedexis.com,10
ec2_us_west_ca,ec2_uswestor03.cedexis.com,10'
),
                'rtt' => array('softlayer_ams' => 300, 'ec2_us_east' => 202, 'ec2_asia_se_singapore' => 101, 'ec2_us_west_ca' => 145),
                'alias' => 'ec2_us_west_ca',
                'cname' => 'ec2_uswestor03.cedexis.com',
                'rand' => array(21),
                'randMax' => array(29),
                'reason' => 'A'
            ),
            // 3: EU is fastest but all destinations are unavailable, choose one from the second fastest region
            array(
                'config' => array( 'ec2_us_east' => 'ec2_asia_se_singapore,sin01.cedexis.com,10
ec2_asia_se_singapore,sin02.cedexis.com,10
ec2_us_east,useastaws01.cedexis.com,10
ec2_us_east,useastaws02.cedexis.com,10
ec2_us_east,useastaws03.cedexis.com,10
ec2_us_west_ca,ec2_uswestor01.cedexis.com,10
ec2_us_west_ca,ec2_uswestor02.cedexis.com,10
ec2_us_west_ca,ec2_uswestor03.cedexis.com,10'
),
                'rtt' => array('softlayer_ams' => 100, 'ec2_us_east' => 202, 'ec2_asia_se_singapore' => 502, 'ec2_us_west_ca' => 400),
                'alias' => 'ec2_us_east',
                'cname' => 'useastaws02.cedexis.com',
                'rand' => array(13),
                'randMax' => array(29),
                'reason' => 'A'
            ),
            // 4: no config data to load, serve Fallback
            array(
                'config' => 'not there',
                'alias' => 'ec2_us_east',
                'reason' => 'B'
            ),
            // 5: No RTT data, round robin amongst available instances
            array(
                'config' => array( 'ec2_us_east' => 'ec2_asia_se_singapore,sin01.cedexis.com,10
ec2_asia_se_singapore,sin02.cedexis.com,10
softlayer_ams,eu-sl01.cedexis.com,10
softlayer_ams,eu-sl02.cedexis.com,10
softlayer_ams,eu-sl03.cedexis.com,10
ec2_us_east,useastaws01.cedexis.com,10
ec2_us_east,useastaws02.cedexis.com,10
ec2_us_east,useastaws03.cedexis.com,10
ec2_us_west_ca,ec2_uswestor01.cedexis.com,10
ec2_us_west_ca,ec2_uswestor02.cedexis.com,10
ec2_us_west_ca,ec2_uswestor03.cedexis.com,10'
),
                'rtt' => 'not an array',
                'alias' => 'softlayer_ams',
                'cname' => 'eu-sl01.cedexis.com',
                'rand' => array(0 => 1, 1 => 1),
                'randMax' => array( 0 => 3, 1 => 29),
                'reason' => 'D'
            ),
        );

        $test=0;
        foreach ($testData as $i)
        {
            print "\nTest Number: $test\n";
            $test++;
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('rand'));
            
            $call_index = 0;
            
                
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

            if(array_key_exists('rand', $i))
            {
                $pos=0;
                foreach($i['rand'] as $j)
                {
                    $application->expects($this->at($pos))
                        ->method('rand')
                        ->with(0, $i['randMax'][$pos])
                        ->will($this->returnValue($i['rand'][$pos]));
                    $pos++;
                }
            }

            
            if (array_key_exists('alias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
            }
            if (array_key_exists('cname', $i))
            {
                $response->expects($this->once())
                    ->method('setCName')
                    ->with($i['cname']);
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
