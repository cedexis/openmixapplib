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
        
        $call_index = 0;
        
        $config->expects($this->at($call_index++))
            ->method('declareInput')
            ->with(GeoProperties::MARKET);
        
        $config->expects($this->exactly(4))->method('declareResponseOption');
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('pacific-1', 'pacific-1.example.com', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('pacific-2', 'pacific-2.example.com', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('atlantic-1', 'atlantic-1.example.com', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('atlantic-2', 'atlantic-2.example.com', 20);
        
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $test_data = array(
            // 'NA' => array( 'pacific-2', 'atlantic-1' ),
            array(
                'market' => 'NA',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'pacific-2',
            ),
            array(
                'market' => 'NA',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'atlantic-1',
            ),
            // 'SA' => array( 'pacific-2', 'atlantic-2' ),
            array(
                'market' => 'SA',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'pacific-2',
            ),
            array(
                'market' => 'SA',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'atlantic-2',
            ),
            // 'EU' => array( 'atlantic-1', 'atlantic-2' ),
            array(
                'market' => 'EU',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'atlantic-1',
            ),
            array(
                'market' => 'EU',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'atlantic-2',
            ),
            // 'AF' => array( 'atlantic-2' ),
            array(
                'market' => 'AF',
                'rand' => array( 0, 0, 0 ),
                'alias' => 'atlantic-2',
            ),
            // 'AS' => array( 'pacific-1', 'pacific-2'),
            array(
                'market' => 'AS',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'pacific-1',
            ),
            array(
                'market' => 'AS',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'pacific-2',
            ),
            // 'OC' => array( 'pacific-1' ),
            array(
                'market' => 'OC',
                'rand' => array( 0, 0, 0 ),
                'alias' => 'pacific-1',
            ),
            // default, array( 'pacific-1', 'pacific-2', 'atlantic-1', 'atlantic-2' )
            array(
                'market' => '',
                'rand' => array( 0, 3, 0 ),
                'alias' => 'pacific-1',
            ),
            array(
                'market' => '',
                'rand' => array( 0, 3, 1 ),
                'alias' => 'pacific-2',
            ),
            array(
                'market' => '',
                'rand' => array( 0, 3, 2 ),
                'alias' => 'atlantic-1',
            ),
            array(
                'market' => '',
                'rand' => array( 0, 3, 3 ),
                'alias' => 'atlantic-2',
            ),
        );
        
        $test = 0;
        foreach ($test_data as $i) {
            //print("\nTest: " . $test++);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('rand'));
            
            $request->expects($this->once())
                ->method('geo')
                ->with(GeoProperties::MARKET)
                ->will($this->returnValue($i['market']));
                
            $application->expects($this->once())
                ->method('rand')
                ->with($i['rand'][0], $i['rand'][1])
                ->will($this->returnValue($i['rand'][2]));
                
            
            $response->expects($this->once())
                ->method('selectProvider')
                ->with($i['alias']);
                
            $utilities->expects($this->never())
                ->method('selectRandom');
            
            $application->service($request, $response, $utilities);
        }
    }
}

?>