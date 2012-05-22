<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixTest extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {

        $servers = array(
            'cdn1' => 'example.com.cdn1.net',
            'cdn2' => 'example.com.cdn2.net');

        $reasons = array('A', 'B', 'C');

        $config = $this->getMock('Configuration');

        $callIndex = 0;

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'cdn1,cdn2');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RequestProperties::HOSTNAME);

        foreach ($servers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 30);
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
            // both meet availability threshold and cdn1 is fastest
            // country 'de' means append '123.' to the provider CNAME
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'hostname' => 'de',
                'alias' => 'cdn1',
                'cname' => '123.example.com.cdn1.net',
                'reason' => 'A'
            ),
            // country 'uk' means append '456.' to the provider CNAME
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 74, 'cdn2' => 100),
                'hostname' => 'uk',
                'alias' => 'cdn2',
                'cname' => '456.example.com.cdn2.net',
                'reason' => 'A'
            ),
            // country 'es' means append '789.' to the provider CNAME
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 74, 'cdn2' => 100),
                'hostname' => 'es',
                'alias' => 'cdn2',
                'cname' => '789.example.com.cdn2.net',
                'reason' => 'A'
            ),
            // cdn1 fails the  availability threshold so we choose cdn2 even though cdn1 is fastest
            // country 'de' means append '123.' to the provider CNAME
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 74, 'cdn2' => 100),
                'hostname' => 'de',
                'alias' => 'cdn2',
                'cname' => '123.example.com.cdn2.net',
                'reason' => 'A'
            ),
            // All servers below availability threshold.  Expect random selection.
            array(
                'rtt' => array('cdn1' => 200, 'cdn2' => 200),
                'avail' => array('cdn1' => 89, 'cdn2' => 89),
                'hostname' => 'de',
                'reason' => 'C'
            ),
            // Data problems
            array(
                'rtt' => null,
                'hostname' => 'de',
                'reason' => 'B'
            ),
            array(
                'rtt' => array(),
                'hostname' => 'de',
                'reason' => 'B'
            ),
        );
        
        $test=0;
        foreach ($testData as $i)
        {
            //print("\nTest: " . $test++);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $reqCallIndex = 0;
            $request->expects($this->at($reqCallIndex++))
                ->method('radar')
                ->with(RadarProbeTypes::HTTP_RTT)
                ->will($this->returnValue($i['rtt']));
            
            $request->expects($this->at($reqCallIndex++))
                ->method('request')
                ->with(RequestProperties::HOSTNAME)
                ->will($this->returnValue($i['hostname']));
                
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
            
            if (array_key_exists('cname', $i))
            {
                $response->expects($this->once())
                    ->method('setCName')
                    ->with($i['cname']);
            }
            else
            {
                $response->expects($this->never())
                    ->method('setCName');
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
