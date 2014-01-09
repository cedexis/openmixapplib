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

        $providers = array(
            'cdn1' => 'cdn1.cedexis.com',
            'cdn2' => 'cdn2.cedexis.com');

        $reasons = array('A', 'B', 'C', 'D');

        $config = $this->getMock('Configuration');

        $callIndex = 0;

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'cdn1,cdn2');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_KBPS, 'cdn1,cdn2');

        $config->expects($this->at($callIndex++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'cdn1,cdn2');

        foreach ($providers as $alias => $cname)
        {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, 20);
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
            array(
                'desc' => 'both are above avail threshold and cdn2 is fastest by more than 5%',
                'kbps' => array('cdn1' => 1000, 'cdn2' => 2009),
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'alias' => 'cdn2',
                'reason' => 'A'
            ),
            array(
                'desc' => 'both are above avail threshold and cdn2 is fastest by less than 5%; use RTT to tie break and cdn1 wins',
                'kbps' => array('cdn1' => 2000, 'cdn2' => 2009),
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
            array(
                'desc' => 'both are above avail threshold and cdn2 is fastest by less than 5%; use RTT to tie break and cdn2 still wins',
                'kbps' => array('cdn1' => 2000, 'cdn2' => 2009),
                'rtt' => array('cdn1' => 201, 'cdn2' => 200),
                'avail' => array('cdn1' => 100, 'cdn2' => 99),
                'alias' => 'cdn2',
                'reason' => 'B'
            ),
            array(
                'desc' => 'both are above avail threshold and cdn1 is fastest by more than 5%',
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'kbps' => array('cdn1' => 2000, 'cdn2' => 1009),
                'alias' => 'cdn1',
                'reason' => 'A'
            ),
            array(
                'desc' => 'both are below avail threshold, cdn1 is least bad removing KBPS and RTT since we won\'t reach that part of the test plan',
                'avail' => array('cdn1' => 88, 'cdn2' => 51),
                'alias' => 'cdn1',
                'reason' => 'D'
            ),
            array(
                'desc' => 'only cdn2 is above avail threshold',
                'avail' => array('cdn1' => 88, 'cdn2' => 90),
                'alias' => 'cdn2',
                'reason' => 'D'
            ),
            array(
                'desc' => 'Both are below cdn2 least bad',
                'avail' => array('cdn1' => 0, 'cdn2' => 20),
                'alias' => 'cdn2',
                'reason' => 'D'
            ),
            array(
                'desc' => 'no KBPS data so use RTT, cdn1 wins',
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'kbps' => array(), // empty array
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
            array(
                'desc' => "only one provider's KBPS data, so select it",
                'rtt' => array('cdn1' => 201, 'cdn2' => 202),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'kbps' => array('cdn1' => 1000), // empty array
                'expectedAlias' => 'cdn1',
                'expectedTTL' => 20,
                'expectedReasonCode' => 'A'
            ),
            array(
                'desc' => 'No RTT or KBPS data, choose randomly',
                'rtt' => array(),
                'avail' => array('cdn1' => 100, 'cdn2' => 100),
                'kbps' => array(),
                'reason' => 'C'
            ),
            array(
                'desc' => 'No KBPS data and RTT data is all zeroes; choose random',
                'rtt' => array( 'cdn1' => 0, 'cdn2' => 0 ),
                'avail' => array( 'cdn1' => 100, 'cdn2' => 100 ),
                'kbps' => array(),
                'reason' => 'C',
            ),
            array(
                'desc' => 'No avail data; cdn1 selected on RTT',
                'avail' => array(),
                'rtt' => array( 'cdn1' => 200, 'cdn2' => 201 ),
                'kbps' => array( 'cdn1' => 1000, 'cdn2' => 1000 ),
                'alias' => 'cdn1',
                'reason' => 'B',
            ),
        );
        $test=0;
        foreach ($testData as $i)
        {
            print("\nTest: " . $test++ . ": " . $i['desc']);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $reqCallIndex = 0;

            
            if (array_key_exists('avail', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::AVAILABILITY)
                    ->will($this->returnValue($i['avail']));
            }

            if (array_key_exists('kbps', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_KBPS)
                    ->will($this->returnValue($i['kbps']));
            }
                
            if (array_key_exists('rtt', $i))
            {
                $request->expects($this->at($reqCallIndex++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
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
