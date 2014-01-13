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
        $test_data = array(
            array(
                'description' => 'standard init',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                    'd' => array('cname' => 'd.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' =>array( 'a' => 'blah', 'b' => 'blah', 'c' => 'blah', ),
                'fusion_aliases' => 'a,b,c',
                'rtt_aliases' => 'a,b,c,d',
                'avail_aliases' => 'a,b,c,d',
                'ttl' => 'some ttl',
                'response_options' => array(
                    array('a', 'a.foo.com', 'some ttl'),
                    array('b', 'b.foo.com', 'some ttl'),
                    array('c', 'c.foo.com', 'some ttl'),
                    array('d', 'd.foo.com', 'some ttl'),
                ),
            ),
        );

        $test_index = 0;
        foreach ($test_data as $i) {
            print("\ninit test " . $test_index++ . ': ' . $i['description']);

            // Test setup
            $config = $this->getMock('Configuration');
            $application = new OpenmixApplication();
            if (array_key_exists('providers', $i)) {
                $application->providers = $i['providers'];
            }
            if (array_key_exists('burstable_cdns', $i)) {
                $application->burstable_cdns = $i['burstable_cdns'];
            }
            if (array_key_exists('ttl', $i)) {
                $application->ttl = $i['ttl'];
            }
            $call_index = 0;

            $config->expects($this->at($call_index++))
                ->method('declareInput')
                ->with('real:fusion:gb', $i['fusion_aliases']);

            $config->expects($this->at($call_index++))
                ->method('declareInput')
                ->with('real:score:http_rtt', $i['rtt_aliases']);

            $config->expects($this->at($call_index++))
                ->method('declareInput')
                ->with('real:score:avail', $i['avail_aliases']);

            $config->expects($this->exactly(3))
                ->method('declareInput');

            foreach ($i['response_options'] as $j) {
                $config->expects($this->at($call_index++))
                    ->method('declareResponseOption')
                    ->with($j[0], $j[1], $j[2]);
            }

            $config->expects($this->exactly(count($i['response_options'])))
                ->method('declareResponseOption');

            $config->expects($this->at($call_index++))->method('declareReasonCode')->with('A');
            $config->expects($this->at($call_index++))->method('declareReasonCode')->with('B');
            $config->expects($this->at($call_index++))->method('declareReasonCode')->with('C');
            $config->expects($this->exactly(3))->method('declareReasonCode');

            // Code under test
            $application->init($config);

            // Assertions
            $this->verifyMockObjects();
        }
    }
    
    /**
     * @test
     */
    public function service()
    {
        $test_data = array(
            array(
                'description' => 'all below gb threshold; all available; provider "a" fastest',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 0, 'b' => 0 ),
                        'rtt' => array( 'a' => 100, 'b' => 200, 'c' => 200 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'a',
                        'reason' => 'A',
                    ),
                ),
            ),
            array(
                'description' => 'all below gb threshold; none available; provider "a" least unavailable',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' =>array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 0, 'b' => 0 ),
                        'rtt' => array( 'a' => 100, 'b' => 200, 'c' => 200 ),
                        'avail' => array( 'a' => 89.9999, 'b' => 89.9998, 'c' => 89.9998 ),
                        'alias' => 'a',
                        'reason' => 'C',
                    ),
                ),
            ),
            array(
                'description' => 'all available; "a" fastest but above gb threshold; "b" fastest after padding adding',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 1100, 'b' => 0 ),
                        'rtt' => array( 'a' => 130, 'b' => 150, 'c' => 200 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'b',
                        'reason' => 'A',
                    ),
                ),
            ),
            array(
                'description' => 'call #1 "b" is over gb threshold, call #2 "a" is over gb threshold; "c" is fastest',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 0, 'b' => 1100 ),
                        'rtt' => array( 'a' => 200, 'b' => 130, 'c' => 150 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'c',
                        'reason' => 'A',
                    ),
                    array(
                        'gb' => array( 'a' => 1100, 'b' => 0 ),
                        'rtt' => array( 'a' => 100, 'b' => 100, 'c' => 150 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'b',
                        'reason' => 'A',
                    ),
                ),
            ),
            array(
                'description' => 'missing gb data; "b" is fastest',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array(),
                        'rtt' => array( 'a' => 200, 'b' => 100, 'c' => 200 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'b',
                        'reason' => 'A',
                    ),
                ),
            ),
            array(
                'description' => 'missing availability data',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 0, 'b' => 0 ),
                        'rtt' => array( 'a' => 200, 'b' => 200, 'c' => 200 ),
                        'avail' => array(),
                        'reason' => 'B',
                    ),
                ),
            ),
            array(
                'description' => 'all below gb threshold; all available; provider "a" fastest; "b" non-score filtered out',
                'providers' => array(
                    'a' => array('cname' => 'a.foo.com', 'padding' => 0),
                    'b' => array('cname' => 'b.foo.com', 'padding' => 0),
                    'c' => array('cname' => 'c.foo.com', 'padding' => 0),
                ),
                'burstable_cdns' => array(
                    'a' => array('threshold' => 1000, 'multiplier' => 1.5),
                    'b' => array('threshold' => 1000, 'multiplier' => 1.5)
                ),
                'availability_threshold' => 90,
                'calls' => array(
                    array(
                        'gb' => array( 'a' => 0, 'b' => 0 ),
                        'rtt' => array( 'a' => 100, 'b' => 200, 'c' => 0 ),
                        'avail' => array( 'a' => 100, 'b' => 100, 'c' => 100 ),
                        'alias' => 'a',
                        'reason' => 'A',
                    ),
                ),
            ),
        );

        $test_index = 0;
        foreach ($test_data as $i) {
            print("\nservice test " . $test_index++ . ': ' . $i['description']);

            // Test setup
            $application = new OpenmixApplication();
            if (array_key_exists('availability_threshold', $i)) {
                $application->availabilityThreshold = $i['availability_threshold'];
            }
            if (array_key_exists('providers', $i)) {
                $application->providers = $i['providers'];
            }
            if (array_key_exists('burstable_cdns', $i)) {
                $application->burstable_cdns = $i['burstable_cdns'];
            }

            $pass = 0;
            foreach ($i['calls'] as $j) {
                print("\nPass " . $pass++);

                // Pass setup
                $request = $this->getMock('Request');
                $response = $this->getMock('Response');
                $utilities = $this->getMock('Utilities');
                $call_index = 0;

                $request->expects($this->at($call_index++))
                    ->method('fusion')
                    ->with('real:fusion:gb')
                    ->will($this->returnValue($j['gb']));

                $request->expects($this->at($call_index++))
                    ->method('radar')
                    ->with('real:score:http_rtt')
                    ->will($this->returnValue($j['rtt']));

                if (array_key_exists('avail', $j)) {
                    $request->expects($this->at($call_index++))
                        ->method('radar')
                        ->with('real:score:avail')
                        ->will($this->returnValue($j['avail']));
                }

                $response->expects($this->once())->method('setReasonCode')->with($j['reason']);

                if (array_key_exists('alias', $j)) {
                    $response->expects($this->once())
                        ->method('selectProvider')
                        ->with($j['alias']);

                    $utilities->expects($this->never())->method('selectRandom');
                }
                else {
                    $utilities->expects($this->once())->method('selectRandom');
                    $response->expects($this->never())->method('selectProvider');
                }

                // Code under test
                $application->service($request, $response, $utilities);

                // Assertions
                $this->verifyMockObjects();
            }
        }
    }
}
?>