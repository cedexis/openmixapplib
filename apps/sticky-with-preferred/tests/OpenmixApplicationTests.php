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
        $config = $this->getMock('Configuration');
        $application = new OpenmixApplication();
        
        $config->expects($this->exactly(9))->method('declareInput');
        
        $call_index = 0;
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::ENABLE);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::AVAILABILITY, 'provider1,provider2,provider3');
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(RadarProbeTypes::HTTP_RTT, 'provider1,provider2,provider3');
            
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
            ->with(EDNSProperties::MARKET);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::COUNTRY);
            
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(EDNSProperties::ASN);
            
        $config->expects($this->exactly(3))->method('declareResponseOption');
        
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider1', 'provider1.foo.com', 30);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider2', 'provider2.foo.com', 30);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('provider3', 'provider3.foo.com', 30);
            
        $config->expects($this->exactly(5))->method('declareReasonCode');
        
        $config->expects($this->at($call_index++))
            ->method('declareReasonCode')
            ->with('A');
            
        $config->expects($this->at($call_index++))
            ->method('declareReasonCode')
            ->with('B');
            
        $config->expects($this->at($call_index++))
            ->method('declareReasonCode')
            ->with('C');
            
        $config->expects($this->at($call_index++))
            ->method('declareReasonCode')
            ->with('D');
            
        $config->expects($this->at($call_index++))
            ->method('declareReasonCode')
            ->with('E');
            
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $test_data = array(
            array(
                'description' => 'RTT empty array',
                'rtt' => array(),
                'reason' => 'A',
                'preferred_after' => array()
            )
            ,array(
                'description' => 'RTT not an array',
                'rtt' => null,
                'reason' => 'A',
                'preferred_after' => array()
            )
            ,array(
                'description' => 'Avail empty array',
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => array(),
                'reason' => 'A',
                'preferred_after' => array()
            )
            ,array(
                'description' => 'Avail not an array',
                'rtt' => array( 'provider1' => 200, 'provider2' => 200, 'provider3' => 200 ),
                'avail' => null,
                'reason' => 'A',
                'preferred_after' => array()
            )
            ,array(
                'description' => 'all providers unavailable',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 200, 'level3' => 200 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 74, 'bitgravity' => 73, 'level3' => 73 ),
                'alias' => 'akamai',
                'reason' => 'C',
                'preferred_before' => 'blah',
                'preferred_after' => 'blah',
            )
            ,array(
                'description' => 'level3 not available, bitgravity fastest, not sticky',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 199, 'level3' => 100 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 75, 'level3' => 74 ),
                'alias' => 'bitgravity',
                'reason' => 'B',
                'preferred_before' => array(),
                'preferred_after' => array(),
            )
            ,array(
                'description' => 'level3 not available, bitgravity fastest, akamai preferred, akamai selected',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 131, 'level3' => 200 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 75, 'level3' => 74 ),
                'alias' => 'akamai',
                'reason' => 'D',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'akamai'
                    )
                ),
            )
            ,array(
                'description' => 'level3 fastest, none saved, akamai preferred, level3 selected',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 200, 'level3' => 129 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 75, 'level3' => 75 ),
                'alias' => 'level3',
                'reason' => 'B',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'level3'
                    )
                ),
            )
            ,array(
                'description' => 'level3 fastest, akamai preferred, bitgravity saved, level3 selected',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 200, 'level3' => 129 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 75, 'level3' => 75 ),
                'alias' => 'level3',
                'reason' => 'B',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'bitgravity'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'level3'
                    )
                ),
            )
            ,array(
                'description' => 'saved provider selected',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 130, 'bitgravity' => 200, 'level3' => 131 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 75, 'level3' => 75 ),
                'alias' => 'bitgravity',
                'reason' => 'E',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'bitgravity'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'bitgravity'
                    )
                ),
            )
            ,array(
                'description' => 'saved provider not available, fastest overrides preferred',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 200, 'level3' => 129 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 74, 'level3' => 75 ),
                'alias' => 'level3',
                'reason' => 'B',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'bitgravity'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'level3'
                    )
                ),
            )
            ,array(
                'description' => 'saved provider not available, preferred selected',
                'providers' => array(
                    'akamai' => array( 'cname' => 'akamai.foo.com', 'penalty' => 0 ),
                    'bitgravity' => array( 'cname' => 'bitgravity.foo.com', 'penalty' => 0 ),
                    'level3' => array( 'cname' => 'level3.foo.com', 'penalty' => 0 )
                ),
                'rtt' => array( 'akamai' => 200, 'bitgravity' => 200, 'level3' => 130 ),
                'avail_threshold' => 75,
                'avail' => array( 'akamai' => 75, 'bitgravity' => 74, 'level3' => 75 ),
                'alias' => 'akamai',
                'reason' => 'D',
                'preferred_before' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'bitgravity'
                    )
                ),
                'preferred_after' => array(
                    'some key' => array(
                        'provider' => 'akamai',
                        'saved' => 'akamai'
                    )
                ),
            )
        );
        
        //print("\nTesting service");
        $test_index = 0;
        foreach ($test_data as $i) {
            //print("\n\nTest index: " . $test_index++);
            //print("\nDescription: " . $i['description']);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('get_key'));
            
            if (array_key_exists('avail_threshold', $i)) {
                $application->availabilityThreshold = $i['avail_threshold'];
            }
            
            if (array_key_exists('providers', $i)) {
                $application->providers = $i['providers'];
            }
            
            if (array_key_exists('preferred_before', $i)) {
                $application->preferred = $i['preferred_before'];
            }
            
            $application->expects($this->once())
                ->method('get_key')
                ->with($this->identicalTo($request))
                ->will($this->returnValue('some key'));
                
            $request_index = 0;
            
            $request->expects($this->at($request_index++))
                ->method('radar')
                ->with(RadarProbeTypes::HTTP_RTT)
                ->will($this->returnValue($i['rtt']));
                
            if (array_key_exists('avail', $i)) {
                $request->expects($this->at($request_index++))
                    ->method('radar')
                    ->with(RadarProbeTypes::AVAILABILITY)
                    ->will($this->returnValue($i['avail']));
            }
            
            if (array_key_exists('alias', $i)) {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);
                    
                $utilities->expects($this->never())
                    ->method('selectRandom');
            }
            else {
                $utilities->expects($this->once())
                    ->method('selectRandom');
                    
                $response->expects($this->never())
                    ->method('selectProvider');
            }
            
            $response->expects($this->once())
                ->method('setReasonCode')
                ->with($i['reason']);
            
            // Code under test
            $application->service($request, $response, $utilities);
            
            // Assertions
            $this->verifyMockObjects();
            $this->assertEquals($i['preferred_after'], $application->preferred);
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
                'result' => 'some edns market-some edns country-some edns asn'
            ),
            array(
                'description' => 'EDNS not enabled',
                'edns_enable' => false,
                'market' => 'some market',
                'country' => 'some country',
                'asn' => 'some asn',
                'result' => 'some market-some country-some asn'
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
                ->with(EDNSProperties::ENABLE)
                ->will($this->returnValue($i['edns_enable']));
                    
            if (true === $i['edns_enable']) {
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
            else {
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
            }
            
            // Code under test
            $application = new OpenmixApplication();
            $result = $application->get_key($request);
            
            // Assertions
            $this->assertEquals($i['result'], $result);
        }
    }
}

?>