<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests extends PHPUnit_Framework_TestCase {
    /**
     * @test
     */
    public function init() {
        //print("\nTesting init");
        $config = $this->getMock('Configuration');
        
        $call_index = 0;
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::ENABLE);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(
                RadarProbeTypes::AVAILABILITY,
                'provider1,provider2,provider3');
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(
                RadarProbeTypes::HTTP_RTT,
                'provider1,provider2,provider3');
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(GeoProperties::MARKET);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(GeoProperties::COUNTRY);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(GeoProperties::ASN);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::ASN);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::COUNTRY);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::MARKET);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider1', 'cname1.foo.com', 30);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider2', 'cname2.foo.com', 30);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider3', 'cname3.foo.com', 30);
            
        $config->expects($this->exactly(8))->method('declareReasonCode');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('A');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('B');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('C');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('D');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('E');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('F');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('G');
        $config->expects($this->at($call_index++))->method('declareReasonCode')->with('H');
        
        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service_handles_exception() {
        $request = $this->getMock('Request');
        $response = $this->getMock('Response');
        $utilities = $this->getMock('Utilities');
        $application = $this->getMock('OpenmixApplication', array('get_key'));
        
        $application->expects($this->once())
            ->method('get_key')
            ->will($this->throwException(new Exception("I'm a hard-coded exception!!!")));
            
        $utilities->expects($this->once())
            ->method('selectRandom');
            
        $response->expects($this->once())
            ->method('setReasonCode')
            ->with('H');
        
        $application->service($request, $response, $utilities);
    }
    
    /**
     * @test
     */
    public function service() {
        $test_data = array(
            array(
                'description' => 'no previous; all available; provider3 fastest',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 199 ),
                'avail' => array( 'provider1' => 80, 'provider2' => 80, 'provider3' => 80 ),
                'alias' => 'provider3',
                'reason' => 'B',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider3' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            ,array(
                'description' => 'previous provider1; all available; provider1 selected; no other providers fast enough',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => array( 'provider1' => 80, 'provider2' => 80, 'provider3' => 80 ),
                'alias' => 'provider1',
                'reason' => 'A',
                'saved_before' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            ,array(
                'description' => 'previous provider1; provider1 not available; provider2 fastest',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 189, 'provider3' => 200 ),
                'avail' => array( 'provider1' => 79, 'provider2' => 80, 'provider3' => 80 ),
                'alias' => 'provider2',
                'reason' => 'B',
                'saved_before' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider2' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            ,array(
                'description' => 'previous provider1; provider1 available; provider2 fastest but not fast enough',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 120, 'provider3' => 200 ),
                'avail' => array( 'provider1' => 80, 'provider2' => 80, 'provider3' => 80 ),
                'alias' => 'provider1',
                'reason' => 'C',
                'saved_before' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            ,array(
                'description' => 'previous provider1; provider1 available; provider2 fast enough to replace it',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 119, 'provider3' => 200 ),
                'avail' => array( 'provider1' => 80, 'provider2' => 80, 'provider3' => 80 ),
                'alias' => 'provider2',
                'reason' => 'D',
                'saved_before' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider2' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            ,array(
                'description' => 'previous provider1; no providers available; provider2 most available',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => array( 'provider1' => 78, 'provider2' => 79, 'provider3' => 78 ),
                'alias' => 'provider2',
                'reason' => 'E',
                'saved_before' => array(
                    'some key' => array( 'provider' => 'provider1' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                ),
                'saved_after' => array(
                    'some key' => array( 'provider' => 'provider2' ),
                    'some other key' => array( 'provider' => 'some other alias' )
                )
            )
            // Data problems
            ,array(
                'description' => 'RTT not an array',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => 'not an array',
                'reason' => 'F',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array( 'some other key' => array( 'provider' => 'some other alias' ) )
            )
            ,array(
                'description' => 'RTT contains invalid data',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'a' => 1, 'b' => 2, 'c' => 3 ),
                'reason' => 'F',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array( 'some other key' => array( 'provider' => 'some other alias' ) )
            )
            ,array(
                'description' => 'Invalid previous alias',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'reason' => 'G',
                'saved_before' => array( 'some key' => array( 'provider' => 'bogus alias' ) ),
                'saved_after' => array( 'some key' => array( 'provider' => 'bogus alias' ) ),
            )
            ,array(
                'description' => 'avail not an array',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => 'not an array',
                'reason' => 'F',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array( 'some other key' => array( 'provider' => 'some other alias' ) )
            )
            ,array(
                'description' => 'avail array empty',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => array(),
                'reason' => 'F',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array( 'some other key' => array( 'provider' => 'some other alias' ) )
            )
            ,array(
                'description' => 'avail array contains invalid data',
                'get_key' => array('some key', 'some country'),
                'availabilityThreshold' => 80,
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => array( 'a' => 1, 'b' => 2, 'c' => 3 ),
                'reason' => 'F',
                'saved_before' => array( 'some other key' => array( 'provider' => 'some other alias' ) ),
                'saved_after' => array( 'some other key' => array( 'provider' => 'some other alias' ) )
            )
        );
        
        //print("\nTesting service");
        $test_index = 0;
        foreach ($test_data as $i) {
            //print("\nTest: " . $test_index++);
            //print("\nDescription: " . $i['description']);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('get_key', 'update_sticky_data'));
            $application->availabilityThreshold = $i['availabilityThreshold'];
            
            $call_index = 0;
            $application_call_index = 0;
            
            $application->expects($this->at($application_call_index++))
                ->method('get_key')
                ->with($this->identicalTo($request))
                ->will($this->returnValue($i['get_key']));
            
            $application->expects($this->at($application_call_index++))
                ->method('update_sticky_data')
                ->with($i['get_key'][0], $i['get_key'][1]);
            
            if (array_key_exists('rtt', $i)) {
                $request->expects($this->at($call_index++))
                    ->method('radar')
                    ->with(RadarProbeTypes::HTTP_RTT)
                    ->will($this->returnValue($i['rtt']));
            }
                
            if (array_key_exists('avail', $i)) {
                $request->expects($this->at($call_index++))
                    ->method('radar')
                    ->with(RadarProbeTypes::AVAILABILITY)
                    ->will($this->returnValue($i['avail']));
            }
            
            if (array_key_exists('alias', $i)) {
                $response->expects($this->once())->method('selectProvider')->with($i['alias']);
                $utilities->expects($this->never())->method('selectRandom');
            }
            else {
                $response->expects($this->never())->method('selectProvider');
                $utilities->expects($this->once())->method('selectRandom');
            }
            
            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            // Pre-seed the application with sticky data
            $application->saved = $i['saved_before'];
            
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
            
            // Further assertions
            $this->assertEquals($i['saved_after'], $application->saved);
        }
    }
    
    /**
     * @test
     */
    public function update_sticky_data() {
        $test_data = array(
            array(
                'description' => 'new key; not maxed; all countries sticky',
                'sticky_countries' => array(),
                'microtime' => 1000,
                'max' => 2,
                'saved_before' => array(
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => null,
                        'timestamp' => 1000
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                ),
            )
            ,array(
                'description' => 'new key; not maxed; request country sticky',
                'sticky_countries' => array( 'some country' ),
                'microtime' => 1000,
                'max' => 2,
                'saved_before' => array(
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100 
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => null,
                        'timestamp' => 1000
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                )
            )
            ,array(
                'description' => 'new key; not maxed; request country sticky; mixed case',
                'sticky_countries' => array( 'US', 'UK', 'FR' ),
                'country' => 'us',
                'microtime' => 1000,
                'max' => 2,
                'saved_before' => array(
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => null,
                        'timestamp' => 1000
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                )
            )
            ,array(
                'description' => 'new key; not maxed; request country not sticky',
                'sticky_countries' => array( 'some other country' ),
                'max' => 2,
                'saved_before' => array(
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                ),
                'saved_after' => array(
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 100
                    )
                )
            )
            ,array(
                'description' => 'new key; maxed; all countries sticky',
                'sticky_countries' => array(),
                'microtime' => 1000,
                'max' => 3,
                'saved_before' => array(
                    'some key 1' => array(
                        'provider' => 'some provider 1',
                        'timestamp' => 99
                    ),
                    'some key 2' => array(
                        'provider' => 'some provider 2',
                        'timestamp' => 100
                    ),
                    'some key 3' => array(
                        'provider' => 'some provider 3',
                        'timestamp' => 100
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => null,
                        'timestamp' => 1000
                    ),
                    'some key 2' => array(
                        'provider' => 'some provider 2',
                        'timestamp' => 100
                    ),
                    'some key 3' => array(
                        'provider' => 'some provider 3',
                        'timestamp' => 100
                    )
                )
            )
            ,array(
                'description' => 'existing key; all countries sticky',
                'sticky_countries' => array(),
                'microtime' => 1000,
                'max' => 2,
                'saved_before' => array(
                    'some key' => array(
                        'provider' => 'some old alias',
                        'timestamp' => 100
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 101
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => 'some old alias',
                        'timestamp' => 1000
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 101
                    )
                )
            )
            ,array(
                'description' => 'existing key; request country sticky',
                'sticky_countries' => array( 'US' ),
                'country' => 'us',
                'microtime' => 1000,
                'max' => 2,
                'saved_before' => array(
                    'some key' => array(
                        'provider' => 'some old alias',
                        'timestamp' => 100
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 101
                    )
                ),
                'saved_after' => array(
                    'some key' => array(
                        'provider' => 'some old alias',
                        'timestamp' => 1000
                    ),
                    'some other key' => array(
                        'provider' => 'some other alias',
                        'timestamp' => 101
                    )
                )
            )
            ,array(
                'description' => 'existing key; request country not sticky',
                'sticky_countries' => array( 'US' ),
                'max' => 2,
                'saved_before' => array(
                    'some key 1' => array(
                        'provider' => 'some provider 1',
                        'timestamp' => 100
                    ),
                    'some key 2' => array(
                        'provider' => 'some provider 2',
                        'timestamp' => 101
                    )
                ),
                'saved_after' => array(
                    'some key 1' => array(
                        'provider' => 'some provider 1',
                        'timestamp' => 100
                    ),
                    'some key 2' => array(
                        'provider' => 'some provider 2',
                        'timestamp' => 101
                    )
                )
            )
        );
        
        //print("\nTesting update_sticky_data");
        $test_index = 0;
        foreach ($test_data as $i) {
            //print("\nTest: " . $test_index++);
            //print("\nDescription: " . $i['description']);
            $application = $this->getMock('OpenmixApplication', array('get_microtime'));
            $application->sticky_countries = $i['sticky_countries'];
            $application->saved = $i['saved_before'];
            $application->max = $i['max'];
            
            if (array_key_exists('microtime', $i)) {
                $application->expects($this->once())
                    ->method('get_microtime')
                    ->will($this->returnValue($i['microtime']));
            }
            else {
                $application->expects($this->never())
                    ->method('get_microtime');
            }
            
            // Code under test
            if (array_key_exists('country', $i)) {
                $application->update_sticky_data('some key', $i['country']);
            }
            else {
                $application->update_sticky_data('some key', 'some country');
            }
            
            // Assertions
            $this->assertEquals($i['saved_after'], $application->saved);
        }
    }
    
    /**
     * @test
     */
    public function get_key() {
        $test_data = array(
            array(
                'description' => 'EDNS enabled',
                'edns_enable' => true,
                'market' => 'some market',
                'country' => 'some country',
                'asn' => 'some asn',
                'edns' => array(
                    'market' => 'some edns market',
                    'country' => 'some edns country',
                    'asn' => 'some edns asn',
                ),
                'result' => array('some edns market-some edns country-some edns asn', 'some edns country')
            ),
            array(
                'description' => 'EDNS not enabled',
                'edns_enable' => false,
                'market' => 'some market',
                'country' => 'some country',
                'asn' => 'some asn',
                'result' => array('some market-some country-some asn', 'some country')
            )
        );
        
        //print("\nTesting get_key");
        //$test_index = 0;
        foreach ($test_data as $i) {
            //print("\nTest: " . $test_index++);
            //print("\nDescription: " . $i['description']);
            $request = $this->getMock('Request');
            $call_index = 0;
                
            $request->expects($this->at($call_index++))
                ->method('geo')
                ->with(GeoProperties::MARKET)
                ->will($this->returnValue($i['market']));
                    
            $request->expects($this->at($call_index++))
                ->method('geo')
                ->with(GeoProperties::COUNTRY)
                ->will($this->returnValue($i['country']));
                    
            $request->expects($this->at($call_index++))
                ->method('geo')
                ->with(GeoProperties::ASN)
                ->will($this->returnValue($i['asn']));
                
            $request->expects($this->at($call_index++))
                ->method('geo')
                ->with(EDNSProperties::ENABLE)
                ->will($this->returnValue($i['edns_enable']));
                
            if (array_key_exists('edns', $i)) {
                $request->expects($this->at($call_index++))
                    ->method('geo')
                    ->with(EDNSProperties::MARKET)
                    ->will($this->returnValue($i['edns']['market']));
                        
                $request->expects($this->at($call_index++))
                    ->method('geo')
                    ->with(EDNSProperties::COUNTRY)
                    ->will($this->returnValue($i['edns']['country']));
                    
                $request->expects($this->at($call_index++))
                    ->method('geo')
                    ->with(EDNSProperties::ASN)
                    ->will($this->returnValue($i['edns']['asn']));
            }
            $application = new OpenmixApplication();
            
            // Code under test
            $result = $application->get_key($request);
            
            // Assertions
            $this->assertEquals($i['result'], $result);
        }
    }
}
?>