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
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function test_garbage_collection()
    {
        $config = $this->getMock('Configuration');
        $application = new OpenmixApplication();
        $application->init($config);
        
        $test_data = array(
            array('market' => 'A', 'country' => 'A', 'asn' => '123'),
            array('market' => 'A', 'country' => 'A', 'asn' => '123'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'C', 'country' => 'C', 'asn' => '345'),
            array('market' => 'C', 'country' => 'C', 'asn' => '345'),
            array('market' => 'A', 'country' => 'A', 'asn' => '456'),
            array('market' => 'A', 'country' => 'A', 'asn' => '456'),
            array('market' => 'B', 'country' => 'B', 'asn' => '567'),
            array('market' => 'C', 'country' => 'C', 'asn' => '678'),
            array('market' => 'D', 'country' => 'A', 'asn' => '123'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'F', 'country' => 'C', 'asn' => '345'),
            array('market' => 'D', 'country' => 'A', 'asn' => '456'),
            array('market' => 'E', 'country' => 'B', 'asn' => '567'),
            array('market' => 'F', 'country' => 'C', 'asn' => '678'),
            array('market' => 'A', 'country' => 'A', 'asn' => '123'),
            array('market' => 'A', 'country' => 'A', 'asn' => '123'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'B', 'country' => 'B', 'asn' => '234'),
            array('market' => 'C', 'country' => 'C', 'asn' => '345'),
            array('market' => 'C', 'country' => 'C', 'asn' => '345'),
            array('market' => 'A', 'country' => 'A', 'asn' => '456'),
            array('market' => 'A', 'country' => 'A', 'asn' => '456'),
            array('market' => 'B', 'country' => 'B', 'asn' => '567'),
            array('market' => 'C', 'country' => 'C', 'asn' => '678'),
            array('market' => 'D', 'country' => 'A', 'asn' => '123'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'E', 'country' => 'B', 'asn' => '234'),
            array('market' => 'F', 'country' => 'C', 'asn' => '345'),
            array('market' => 'D', 'country' => 'A', 'asn' => '456'),
            array('market' => 'E', 'country' => 'B', 'asn' => '567'),
            array('market' => 'F', 'country' => 'C', 'asn' => '678'),
        );
        
        foreach ($test_data as $i) {
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            
            $request_call_idx = 0;
            $request->expects($this->at($request_call_idx++))
                ->method('geo')
                ->with(GeoProperties::MARKET)
                ->will($this->returnValue($i['market']));
                
            $request->expects($this->at($request_call_idx++))
                ->method('geo')
                ->with(GeoProperties::COUNTRY)
                ->will($this->returnValue($i['country']));
                
            $request->expects($this->at($request_call_idx++))
                ->method('geo')
                ->with(GeoProperties::ASN)
                ->will($this->returnValue($i['asn']));
            
            $application->service($request, $response, $utilities);
        }
    }
}

?>