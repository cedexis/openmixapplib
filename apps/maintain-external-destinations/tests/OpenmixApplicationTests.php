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
            'amazon_ec2___asia_se__singapore__1a' => 'tobeoverwritten',
            'amazon_ec2___eu_west_1a' => 'tobeoverwritten',
            'amazon_ec2___us_east_1a' => 'tobeoverwritten'
        );
        $fallback = array( 'dc1' => 'dc1.example.com');
        $reasons = array('A', 'B', 'C', 'D');
        
        $config = $this->getMock('Configuration');
        
        $call_index = 0;
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'dc1');
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'amazon_ec2___asia_se__singapore__1a,amazon_ec2___eu_west_1a,amazon_ec2___us_east_1a');

        foreach ($platforms as $alias => $cname)
        {
            $config->expects($this->at($call_index++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
        }
        foreach ($fallback as $alias => $cname)
        {
            $config->expects($this->at($call_index++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
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
            // 0: all are available and EU West is fastest
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,1
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws01.cedexis.com,1
amazon_ec2___eu_west_1a,euaws02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws03.cedexis.com,1
amazon_ec2___us_east_1a,useastaws01.cedexis.com,1
amazon_ec2___us_east_1a,useastaws02.cedexis.com,1
amazon_ec2___us_east_1a,useastaws03.cedexis.com,1'),
                'rtt' => array('amazon_ec2___eu_west_1a' => 100, 'amazon_ec2___us_east_1a' => 202, 'amazon_ec2___asia_se__singapore__1a' => 202),
                'alias' => 'amazon_ec2___eu_west_1a',
                'cname' => 'euaws01.cedexis.com',
                'rand' => 0,
                'randMax' => 2,
                'reason' => 'A'
            ),
            // 1: all are available and Singapore is fastest
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,1
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws01.cedexis.com,1
amazon_ec2___eu_west_1a,euaws02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws03.cedexis.com,1
amazon_ec2___us_east_1a,useastaws01.cedexis.com,1
amazon_ec2___us_east_1a,useastaws02.cedexis.com,1
amazon_ec2___us_east_1a,useastaws03.cedexis.com,1'),
                'rtt' => array('amazon_ec2___eu_west_1a' => 300, 'amazon_ec2___us_east_1a' => 202, 'amazon_ec2___asia_se__singapore__1a' => 102),
                'alias' => 'amazon_ec2___asia_se__singapore__1a',
                'cname' => 'sin02.cedexis.com',
                'rand' => 1,
                'randMax' => 1,
                'reason' => 'A'
            ),
            // 2: Singapore is fastest but one destination is unavailable
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,1
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws01.cedexis.com,1
amazon_ec2___eu_west_1a,euaws02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws03.cedexis.com,1
amazon_ec2___us_east_1a,useastaws01.cedexis.com,1
amazon_ec2___us_east_1a,useastaws02.cedexis.com,1
amazon_ec2___us_east_1a,useastaws03.cedexis.com,1'),
                'rtt' => array('amazon_ec2___eu_west_1a' => 300, 'amazon_ec2___us_east_1a' => 202, 'amazon_ec2___asia_se__singapore__1a' => 102),
                'alias' => 'amazon_ec2___asia_se__singapore__1a',
                'cname' => 'sin01.cedexis.com',
                'rand' => 0,
                'randMax' => 0,
                'reason' => 'A'
            ),
            // 3: Singapore is fastest but all destination are unavailable, choose one from the second fastest region
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,0
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws01.cedexis.com,1
amazon_ec2___eu_west_1a,euaws02.cedexis.com,1
amazon_ec2___eu_west_1a,euaws03.cedexis.com,1
amazon_ec2___us_east_1a,useastaws01.cedexis.com,1
amazon_ec2___us_east_1a,useastaws02.cedexis.com,1
amazon_ec2___us_east_1a,useastaws03.cedexis.com,1'),
                'rtt' => array('amazon_ec2___eu_west_1a' => 300, 'amazon_ec2___us_east_1a' => 202, 'amazon_ec2___asia_se__singapore__1a' => 102),
                'alias' => 'amazon_ec2___us_east_1a',
                'cname' => 'useastaws02.cedexis.com',
                'rand' => 1,
                'randMax' => 2,
                'reason' => 'A'
            ),
            // 4: only 1 destination available
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,0
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws01.cedexis.com,0
amazon_ec2___eu_west_1a,euaws02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws03.cedexis.com,0
amazon_ec2___us_east_1a,useastaws01.cedexis.com,0
amazon_ec2___us_east_1a,useastaws02.cedexis.com,0
amazon_ec2___us_east_1a,useastaws03.cedexis.com,1'),
                'alias' => 'amazon_ec2___us_east_1a',
                'cname' => 'useastaws03.cedexis.com',
                'reason' => 'C'
            ),
            // 5: all destinations marked down, serve fallback
            array(
                'config' => array( 'dc1' => 'amazon_ec2___asia_se__singapore__1a,sin01.cedexis.com,0
amazon_ec2___asia_se__singapore__1a,sin02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws01.cedexis.com,0
amazon_ec2___eu_west_1a,euaws02.cedexis.com,0
amazon_ec2___eu_west_1a,euaws03.cedexis.com,0
amazon_ec2___us_east_1a,useastaws01.cedexis.com,0
amazon_ec2___us_east_1a,useastaws02.cedexis.com,0
amazon_ec2___us_east_1a,useastaws03.cedexis.com,0'),
                'alias' => 'dc1',
                'reason' => 'B'
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
            
            if (array_key_exists('rand', $i))
            {
                $application->expects($this->once())
                    ->method('rand')
                    ->with(0, $i['randMax'])
                    ->will($this->returnValue($i['rand']));
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
