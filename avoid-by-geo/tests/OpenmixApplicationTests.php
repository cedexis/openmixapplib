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
            'cdn1' => 'orig.example.cdn1.net',
            'cdn2' => 'www.example.com.cdn2.net',
            'cdn3' => 'www.someotherprovider.net');

        $reasons = array('A', 'B', 'C');

        $config = $this->getMock('Configuration');

        $callIndex = 0;

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2,cdn3');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'cdn1,cdn2,cdn3');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(GeoProperties::COUNTRY);
            
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
            // Don't select cdn2 even though it's fastest because the request is not from China.
            array(
                'rtt' => array('cdn1' => 200, 'cdn2' => 199, 'cdn3' => 200),
                'country' => 'US',
                'avail' => array('cdn1' => 90, 'cdn2' => 90, 'cdn3' => 90),
                'alias' => 'cdn3',
                'reason' => 'A'),
            // Don't select cdn2 even though it's fastest because the request
            // is not from China. Select cdn1 because it's next fastest.
            array(
                'rtt' => array('cdn1' => 200, 'cdn2' => 199, 'cdn3' => 201),
                'country' => 'GB',
                'avail' => array('cdn1' => 90, 'cdn2' => 90, 'cdn3' => 90),
                'alias' => 'cdn1',
                'reason' => 'A'),
            // Select cdn2 because it's fastest, and the request is from China.
            array(
                'rtt' => array('cdn1' => 200, 'cdn2' => 199, 'cdn3' => 200),
                'country' => 'CN',
                'avail' => array('cdn1' => 90, 'cdn2' => 90, 'cdn3' => 90),
                'alias' => 'cdn2',
                'reason' => 'A'),
            // All servers are below availability threshold.
            array(
                'rtt' => array('cdn1' => 200, 'cdn2' => 200, 'cdn3' => 200),
                'country' => 'CN',
                'avail' => array('cdn1' => 89, 'cdn2' => 89, 'cdn3' => 89),
                'reason' => 'C'),
            // Missing data
            array(
                'rtt' => null,
                'country' => 'some country',
                'reason' => 'B'),
            array(
                'rtt' => null,
                'country' => 'CN',
                'reason' => 'B'),
            array(
                'rtt' => array(),
                'country' => 'some country',
                'reason' => 'B'),
            array(
                // China data missing
                'rtt' => array('cdn1' => 200, 'cdn3' => 201),
                'avail' => array('cdn1' => 90, 'cdn2' => 90, 'cdn3' => 90),
                'country' => 'CN',
                'alias' => 'cdn1',
                'reason' => 'A'),
        );
        
        $testIndex = 0;
        foreach ($testData as $i)
        {
            //print("\nTest index: " . $testIndex++);
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
