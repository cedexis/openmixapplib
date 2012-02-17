<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/ConditionalHostname.php');

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
                'expectedAlias' => 'cdn1',
                'expectedServer' => '123.example.com.cdn1.net',
                'expectedTTL' => 30,
                'expectedReasonCode' => 'A'
            ),
        // cdn1 fails the  availability threshold so we choose cdn2 even though cdn1 is fastest
        // country 'de' means append '123.' to the provider CNAME
            array(
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 74, 'cdn2' => 100),
                'hostname' => 'de',
                'expectedAlias' => 'cdn2',
                'expectedServer' => '123.example.com.cdn2.net',
                'expectedTTL' => 30,
                'expectedReasonCode' => 'A'
            ),
        );


        $test=1;

        foreach ($testData as $i)
        {
            print("\n##############Test: " . $test++ . "\n");
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');

            print("avail in test:\n");
            print_r($i['avail']);

            $reqCallIndex = 0;

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
                

             $request->expects($this->at($reqCallIndex++))
                ->method('geo')
                ->with(RequestProperties::HOSTNAME)
                ->will($this->returnValue($i['hostname']));

            if (array_key_exists('expectedAlias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['expectedAlias']);

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

            if (array_key_exists('expectedServer', $i))
            {
                $response->expects($this->once())
                ->method('setCName')
                ->with($i['expectedServer']);
            }
            else
            {
                $response->expects($this->never())
                    ->method('setCName');
            }

            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['expectedReasonCode']);


            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
        }
    }
}

?>
