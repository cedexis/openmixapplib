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
        $app = new OpenmixApplication();
        $app->providers = array(
            'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
            'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
            'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
        );
        $config = $this->getMock('Configuration');
        
        $config->expects($this->exactly(7))
            ->method('declareInput')
            ->withConsecutive(
                array('real:score:http_rtt', 'cdn1,cdn2,cdn3'),
                array('real:score:avail', 'cdn1,cdn2,cdn3'),
                array('integer:enable_edns:enable_edns'),
                array('string:geo:market_iso'),
                array('string:edns:market_iso'),
                array('string:geo:country_iso'),
                array('string:edns:country_iso')
            );
        
        $config->expects($this->exactly(3))
            ->method('declareResponseOption')
            ->withConsecutive(
                array('cdn1', 'www.example.coolcdn.com', 20),
                array('cdn2', 'www.example.awesomecdn.com', 20),
                array('cdn3', 'www.example.excellentcdn.com', 20)
            );
        
        $config->expects($this->exactly(4))
            ->method('declareReasonCode')
            ->withConsecutive(
                array('A'),
                array('B'),
                array('C'),
                array('D')
            );
        
        // Code under test
        $app->init($config);
    }
    
    /**
     * @test
     */
    public function service() {
        $test_data = array(
            array(
                'description' => 'cdn2 offline; no overrides; all available; cdn3 fastest available',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 0),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 50)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 0),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array('cdn1' => 200, 'cdn2' => 100, 'cdn3' => 101)
                    ),
                    array(
                        RadarProbeTypes::AVAIL,
                        array('cdn1' => 100, 'cdn2' => 100, 'cdn3' => 100)
                    )
                ),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            array(
                'description' => 'all online; test market overrides; cdn2 fastests but unavailable',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(
                    'NA' => array( 'cdn1' => 75, 'cdn2' => 50 )
                ),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 49),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array('cdn1' => 200, 'cdn2' => 100, 'cdn3' => 101)
                    ),
                    array(
                        RadarProbeTypes::AVAIL,
                        array('cdn1' => 100, 'cdn2' => 89.99999, 'cdn3' => 100)
                    )
                ),
                'alias' => 'cdn3',
                'reason' => 'A'
            ),
            array(
                'description' => 'none available; select most available',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 99),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array('cdn1' => 200, 'cdn2' => 200, 'cdn3' => 200)
                    ),
                    array(
                        RadarProbeTypes::AVAIL,
                        array('cdn1' => 89, 'cdn2' => 88, 'cdn3' => 88)
                    )
                ),
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
            array(
                'description' => 'only 1 provider to consider',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(
                    'US' => array( 'cdn1' => 100, 'cdn2' => 99, 'cdn3' => 99 )
                ),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 99),
                'alias' => 'cdn1',
                'reason' => 'C'
            ),
            array(
                'description' => 'no RTT data',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 0),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array()
                    )
                ),
                'reason' => 'D'
            ),
            array(
                'description' => 'no availability data',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 0),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array('cdn1' => 200, 'cdn2' => 200, 'cdn3' => 200)
                    ),
                    array(
                        RadarProbeTypes::AVAIL,
                        array()
                    )
                ),
                'reason' => 'D'
            ),
            array(
                'description' => 'cdn2 is fastest but missing availability data; others'
                    . ' are unavailable; cdn1 is most available',
                'providers' => array(
                    'cdn1' => array('cname' => 'www.example.coolcdn.com', 'percentage' => 100),
                    'cdn2' => array('cname' => 'www.example.awesomecdn.com', 'percentage' => 100),
                    'cdn3' => array('cname' => 'www.example.excellentcdn.com', 'percentage' => 100)
                ),
                'availabilityThreshold' => 90,
                'market_overrides' => array(),
                'country_overrides' => array(),
                'geo' => array(
                    array(EDNSProperties::ENABLE, 1),
                    array(GeoProperties::MARKET, 'NA'),
                    array(EDNSProperties::MARKET, 'NA'),
                    array(GeoProperties::COUNTRY, 'US'),
                    array(EDNSProperties::COUNTRY, 'US')
                ),
                'rand' => array(0, 99, 0),
                'radar' => array(
                    array(
                        RadarProbeTypes::HTTP_RTT,
                        array( 'cdn1' => 199, 'cdn2' => 100, 'cdn3' => 200 )
                    ),
                    array(
                        RadarProbeTypes::AVAIL,
                        array( 'cdn1' => 89, 'cdn3' => 88 )
                    )
                ),
                'alias' => 'cdn1',
                'reason' => 'B'
            ),
        );
        
        $test = 0;
        foreach ($test_data as $i) {
            print("\nTest " . $test++ . ': ' . $i['description']);
            // Setup
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $app = $this->getMock('OpenmixApplication', array('rand'));
            $app->availabilityThreshold = $i['availabilityThreshold'];
            $app->providers = $i['providers'];
            $app->market_overrides = $i['market_overrides'];
            $app->country_overrides = $i['country_overrides'];
            
            $request->expects($this->any())
                ->method('geo')
                ->will($this->returnValueMap($i['geo']));
                
            if (array_key_exists('radar', $i)) {
                $request->expects($this->any())
                    ->method('radar')
                    ->will($this->returnValueMap($i['radar']));
            }
            else {
                $request->expects($this->never())->method('radar');
            }
                
            $app->expects($this->once())
                ->method('rand')
                ->with($i['rand'][0], $i['rand'][1])
                ->will($this->returnValue($i['rand'][2]));
                
            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
                
            if (array_key_exists('alias', $i)) {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
                $utilities->expects($this->never())->method('selectRandom');
            }
            else {
                $response->expects($this->never())->method('selectProvider');
                $utilities->expects($this->once())->method('selectRandom');
            }
            
            // Code under test
            $app->service($request, $response, $utilities);
            
            // Assert
            $this->verifyMockObjects();
        }
    }
}

?>
