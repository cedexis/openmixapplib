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
                'description' => 'default',
                'declareResponseOption' => array(
                    array('dc', 'dc.example.com', 5),
                    array('cdn', 'example.cdn.com', 5)
                ),
                'pulse_load_providers' => 'dc'
            ),
            array(
                'data_centers' => array(
                    'dc1' => 'dc1.example.com',
                    'dc2' => 'dc2.example.com'
                ),
                'providers' => array(
                    'cdn1' => 'example.cdn1.com',
                    'cdn2' => 'example.cdn2.com'
                ),
                'ttl' => 123,
                'load_tested_providers' => array('dc1', 'dc2'),
                'declareResponseOption' => array(
                    array('dc1', 'dc1.example.com', 123),
                    array('dc2', 'dc2.example.com', 123),
                    array('cdn1', 'example.cdn1.com', 123),
                    array('cdn2', 'example.cdn2.com', 123)
                ),
                'pulse_load_providers' => 'dc1,dc2'
            )
        );
        
        $test = 0;
        foreach ($test_data as $i) {
            if (array_key_exists('description', $i)) { print("\nTest $test: " . $i['description']); }
            else { print("\nTest $test"); }
            $test++;
            
            // Setup
            $config = $this->getMock('Configuration');
            $application = new OpenmixApplication();
            
            if (array_key_exists('data_centers', $i)) {
                $application->data_centers = $i['data_centers'];
            }
            
            if (array_key_exists('providers', $i)) {
                $application->providers = $i['providers'];
            }
            
            if (array_key_exists('ttl', $i)) {
                $application->ttl = $i['ttl'];
            }
            
            if (array_key_exists('load_tested_providers', $i)) {
                $application->load_tested_providers = $i['load_tested_providers'];
            }
            
            // Expectations
            $call_index = 0;
            foreach ($i['declareResponseOption'] as $j) {
                $config->expects($this->at($call_index++))
                    ->method('declareResponseOption')
                    ->with($j[0], $j[1], $j[2]);
            }
            
            $config->expects($this->at($call_index++))
                ->method('declareInput')
                ->with('longstring:pload:load', $i['pulse_load_providers']);
            
            $application->init($config);
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
                'description' => 'all data centers at or below threshold; dc1 selected',
                'data_centers' => array(
                    'dc1' => 'dc1.example.com',
                    'dc2' => 'dc2.example.com'
                ),
                'providers' => array(
                    'cdn1' => 'example.cdn1.com',
                    'cdn2' => 'example.cdn2.com'
                ),
                'fc' => array(
                    'dc1' => "80\n80\n",
                    'dc2' => "80\n80\n"
                ),
                'getRand' => array(
                    array(0, 1, 0)
                ),
                'alias' => 'dc1'
            ),
            array(
                'description' => 'crazy newlines',
                'data_centers' => array(
                    'dc1' => 'dc1.example.com',
                    'dc2' => 'dc2.example.com'
                ),
                'providers' => array(
                    'cdn1' => 'example.cdn1.com',
                    'cdn2' => 'example.cdn2.com'
                ),
                'fc' => array(
                    'dc1' => "\r\n\r\n80\r\n\r\n80\n",
                    'dc2' => "\r\n\r\n80\r\n\r\n80\n",
                ),
                'getRand' => array(
                    array(0, 1, 0)
                ),
                'alias' => 'dc1'
            ),
            array(
                'description' => 'dc1 above threshold; dc1 selected but route to cdn1',
                'data_centers' => array(
                    'dc1' => 'dc1.example.com',
                    'dc2' => 'dc2.example.com'
                ),
                'providers' => array(
                    'cdn1' => 'example.cdn1.com',
                    'cdn2' => 'example.cdn2.com'
                ),
                'fc' => array(
                    'dc1' => "81\n80\n",
                    'dc2' => "80\n80\n"
                ),
                'getRand' => array(
                    array(0, 1, 0),
                    array(1, 100, 5),
                    array(0, 1, 0)
                ),
                'alias' => 'cdn1'
            ),
            array(
                'description' => 'dc1 above threshold; dc1 selected',
                'data_centers' => array(
                    'dc1' => 'dc1.example.com',
                    'dc2' => 'dc2.example.com'
                ),
                'providers' => array(
                    'cdn1' => 'example.cdn1.com',
                    'cdn2' => 'example.cdn2.com'
                ),
                'fc' => array(
                    'dc1' => "81\n80\n",
                    'dc2' => "80\n80\n"
                ),
                'getRand' => array(
                    array(0, 1, 0),
                    array(1, 100, 6)
                ),
                'alias' => 'dc1'
            ),
            array(
                'description' => 'default; dc max load, cdn selected (high)',
                'fc' => array(
                    'dc' => "100\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 100),
                    array(0, 0, 0)
                ),
                'alias' => 'cdn'
            ),
            array(
                'description' => 'default; dc max load, cdn selected (low)',
                'fc' => array(
                    'dc' => "100\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 1),
                    array(0, 0, 0)
                ),
                'alias' => 'cdn'
            ),
            array(
                'description' => 'default; dc almost maxed; cdn selected (low)',
                'fc' => array(
                    'dc' => "99\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 1),
                    array(0, 0, 0)
                ),
                'alias' => 'cdn'
            ),
            array(
                'description' => 'default; dc almost maxed; cdn selected (high)',
                'fc' => array(
                    'dc' => "99\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 95),
                    array(0, 0, 0)
                ),
                'alias' => 'cdn'
            ),
            array(
                'description' => 'default; dc almost maxed; dc selected',
                'fc' => array(
                    'dc' => "99\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 96)
                ),
                'alias' => 'dc'
            ),
            array(
                'description' => 'default; dc almost maxed; cdn selected; floats',
                'fc' => array(
                    'dc' => "99.99\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 99),
                    array(0, 0, 0)
                ),
                'alias' => 'cdn'
            ),
            array(
                'description' => 'default; dc almost maxed; dc selected; floats',
                'fc' => array(
                    'dc' => "99.99\n80\n"
                ),
                'getRand' => array(
                    array(0, 0, 0),
                    array(1, 100, 100)
                ),
                'alias' => 'dc'
            ),
            array(
                'description' => 'production, low threshold, not over threshold',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "48\n50" ),
                'getRand' => array( array(0, 0, 0) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, low threshold, over threshold, select CDN (low)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "51\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 1), array(0, 0, 0) ),
                'alias' => 'amazon_ec2___eu__ireland'
            ),
            array(
                'description' => 'production, low threshold, over threshold, select CDN (high)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "51\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 2), array(0, 0, 0) ),
                'alias' => 'amazon_ec2___eu__ireland'
            ),
            array(
                'description' => 'production, low threshold, over threshold, select data center (low)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "51\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 3) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, low threshold, over threshold, select data center (high)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "51\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 100) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, high threshold, over threshold, select data center (low)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "99\n98" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 51) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, high threshold, over threshold, select CDN (high)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "99\n98" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 50), array(0, 0, 0) ),
                'alias' => 'amazon_ec2___eu__ireland'
            ),
            array(
                'description' => 'production, high threshold, at threshold',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "98\n98" ),
                'getRand' => array( array(0, 0, 0) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, low threshold, high load, select CDN (high)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "99\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 98), array(0, 0, 0) ),
                'alias' => 'amazon_ec2___eu__ireland'
            ),
            array(
                'description' => 'production, low threshold, high load, select data center (low)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "99\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 99) ),
                'alias' => 'DataCentre1'
            ),
            array(
                'description' => 'production, low threshold, max load, select CDN (high)',
                'data_centers' => array( 'DataCentre1' => 'dc.example.com' ),
                'providers' => array( 'amazon_ec2___eu__ireland' => 'example.cdn.com' ),
                'fc' => array( 'DataCentre1' => "100\n50" ),
                'getRand' => array( array(0, 0, 0), array(1, 100, 100), array(0, 0, 0) ),
                'alias' => 'amazon_ec2___eu__ireland'
            ),
        );
        
        $test = 0;
        foreach ($test_data as $i) {
            if (array_key_exists('description', $i)) { print("\nTest $test: " . $i['description']); }
            else { print("\nTest $test"); }
            $test++;
            
            // Setup
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('getRand'));
            
            if (array_key_exists('data_centers', $i)) {
                $application->data_centers = $i['data_centers'];
            }
            
            if (array_key_exists('providers', $i)) {
                $application->providers = $i['providers'];
            }
            
            // Expectations
            $app_call_index = 0;
            foreach ($i['getRand'] as $j) {
                $application->expects($this->at($app_call_index++))
                    ->method('getRand')
                    ->with($j[0], $j[1])
                    ->will($this->returnValue($j[2]));
            }
            $application->expects($this->exactly(count($i['getRand'])))->method('getRand');
            
            $call_index = 0;
            if (array_key_exists('fc', $i)) {
                $request->expects($this->at($call_index++))
                    ->method('pulse')
                    ->with('longstring:pload:load')
                    ->will($this->returnValue($i['fc']));
            }
            
            $response->expects($this->once())
                ->method('selectProvider')
                ->with($i['alias']);
            
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>