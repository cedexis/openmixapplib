<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/Remove-by-Geo.php');

class OpenmixTest extends PHPUnit_Framework_TestCase
{
    /**
     * @test
     */
    public function init()
    {

        $servers = array(
            'cdn1' => 'orig.example.cdn1.net',
            'cdn2' => 'www.example.com.cdn2.net');

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
            ->with(GeoProperties::COUNTRY);

        foreach ($reasons as $code)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareReasonCode')
                ->with($code);
        }

        foreach ($servers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
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
            array(
                'market' => 'NA',
                'country' => 'US',
                'expectedAlias' => 'server_us'),
            array(
                'market' => 'EU',
                'country' => 'GB',
                'expectedAlias' => 'server_gb'),
            array(
                'market' => 'AF',
                'country' => 'ZA',
                'expectedAlias' => 'server_bf'),
            array(
                'market' => 'EU',
                'country' => 'ES',
                'expectedAlias' => 'server_us'),
            array(
                'market' => 'AF',
                'country' => 'EG',
                'expectedAlias' => 'server_gb'),
            array(
                'market' => 'some market',
                'country' => 'some country'),
        );

        foreach ($testData as $i)
        {
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');

            $reqCallIndex = 0;

            $request->expects($this->at($reqCallIndex++))
                ->method('radar')
                ->with(RadarProbeTypes::HTTP_RTT)
                ->will($this->returnValue($i['rtt']));


             $request->expects($this->at($reqCallIndex++))
                ->method('geo')
                ->with(GeoProperties::COUNTRY)
                ->will($this->returnValue($i['country']));

            if (array_key_exists('expectedAlias', $i))
            {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['expectedAlias']);

                $response->expects($this->once())
                    ->method('setReasonCode')
                    ->with($this->logicalOr('A', 'B'));

                $utilities->expects($this->never())
                    ->method('selectRandom');
            }
            else
            {
                $response->expects($this->once())
                    ->method('setReasonCode')
                    ->with('C');

                $utilities->expects($this->once())
                    ->method('selectRandom');

                $response->expects($this->never())
                    ->method('selectProvider');
            }

            $app = new OpenmixApplication();
            $app->service($request, $response, $utilities);
        }
    }
}

?>
