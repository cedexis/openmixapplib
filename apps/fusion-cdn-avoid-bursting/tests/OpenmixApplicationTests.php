<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests  extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {
        $servers = array(
        'akamai' => array('cname' => 'akamai.example.com', 'padding' => 0),
        'edgecast__small' => array('cname' => 'edgecast.example.com', 'padding' => 0),
        'origin' => array('cname' => 'a.origin.com', 'padding' => 0)
        );

        $burstable_cdns = array(
            'akamai' => array('threshold' => floatval(100), 'multiplier' => floatval(1.5))
            );
        
        $reasons = array('A', 'B', 'C');
        
        $config = $this->getMock('Configuration');
        
        $callIndex = 0;

        foreach ($burstable_cdns as $alias => $settings)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareInput')
                ->with(FusionProperties::MBPS, $alias);
        }

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'akamai,edgecast__small,origin');
            
        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'akamai,edgecast__small,origin');
            
        foreach ($servers as $alias => $settings)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $settings['cname'], 30);
        }
        
        foreach ($reasons as $code)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareReasonCode')
                ->with($code);
        }
        
        $app = new OpenmixApplication();
        $app->init($config);
    }

    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            //0: all are available, mbps is under and akamai is fastest
            array(
                'mbps' => array('akamai' => 88),
                'rtt' => array('akamai' => 201, 'edgecast__small' => 202, 'origin' => 202),
                'avail' => array('akamai' => 100, 'edgecast__small' => 100, 'origin' => 100),
                'alias' => 'akamai',
                'reason' => 'A'
            ),
            //1: all are available, mbps is under and edgecast__small is fastest
            array(
                'mbps' => array('akamai' => 88),
                'mbps' => 88,
                'rtt' => array('akamai' => 202, 'edgecast__small' => 201, 'origin' => 202),
                'avail' => array('akamai' => 100, 'edgecast__small' => 100, 'origin' => 100),
                'alias' => 'edgecast__small',
                'reason' => 'A'
            ),
            //2: all are available, mbps is over and akamak is fastest but edgecast__small wins
            array(
                'mbps' => array('akamai' => 150),
                'rtt' => array('akamai' => 200, 'edgecast__small' => 201, 'origin' => 202),
                'avail' => array('akamai' => 100, 'edgecast__small' => 100, 'origin' => 100),
                'alias' => 'edgecast__small',
                'reason' => 'A'
            ),
            //3: all are available and origin is fastest
            array(
                'mbps' => array('akamai' => 150),
                'rtt' => array('akamai' => 202, 'edgecast__small' => 202, 'origin' => 171),
                'avail' => array('akamai' => 100, 'edgecast__small' => 100, 'origin' => 100),
                'alias' => 'origin',
                'reason' => 'A'
            ),
            //4: akamai excluded due to availability, edgecast__small next fastest
            array(
                'mbps' => array('akamai' => 50),
                'rtt' => array('akamai' => 201, 'edgecast__small' => 202, 'origin' => 203),
                'avail' => array('akamai' => 89, 'edgecast__small' => 100, 'origin' => 100),
                'alias' => 'edgecast__small',
                'reason' => 'A'
            ),
            //5: none available, choose least bad
            array(
                'mbps' => array('akamai' => 88),
                'rtt' => array('akamai' => 201, 'edgecast__small' => 202, 'origin' => 202),
                'avail' => array('akamai' => 89, 'edgecast__small' => 88, 'origin' => 87),
                'alias' => 'akamai',
                'reason' => 'C'
            ),
            //6: Data problems
            array(
                'mbps' => array('akamai' => 78),
                'rtt' => 'something not an array',
                'reason' => 'B'
            ),
        );

        $test=0;
        foreach ($testData as $i)
        {
            print("\nTest: " . $test++ . "\n");
            
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $reqCallIndex = 0;
            
            if (array_key_exists('mbps', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('fusion')
                    ->with(FusionProperties::MBPS)
                    ->will($this->returnValue($i['mbps']));
            }
            
            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }
            
            if (array_key_exists('avail', $i))
            {
                $request->expects($this->at($reqCallIndex++))
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
                $response->expects($this->never())
                    ->method('selectProvider');
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }

     }
}

?>
