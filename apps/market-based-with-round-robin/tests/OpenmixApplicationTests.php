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
        
        // probe1.atl.tmd.prod,65.254.36.226
        // probe1.rbx.ovh.prod,94.23.254.99
        // probe1.sbg.ovh.prod,37.59.8.25
        // probe1.sin.sl.prod,119.81.23.243
        // probe1.sjc.sl.prod,50.97.227.68
        
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('probe1.atl.tmd.prod', '65.254.36.226', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('probe1.rbx.ovh.prod', '94.23.254.99', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('probe1.sbg.ovh.prod', '37.59.8.25', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('probe1.sin.sl.prod', '119.81.23.243', 20);
            
        $config->expects($this->at($call_index++))
            ->method('declareResponseOption')
            ->with('probe1.sjc.sl.prod', '50.97.227.68', 20);
        
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $test_data = array(
            // 'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
            array(
                'market' => 'NA',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.sjc.sl.prod',
            ),
            array(
                'market' => 'NA',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.atl.tmd.prod',
            ),
            // 'SA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
            array(
                'market' => 'SA',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.sjc.sl.prod',
            ),
            array(
                'market' => 'SA',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.atl.tmd.prod',
            ),
            // 'EU' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod' ),
            array(
                'market' => 'EU',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.rbx.ovh.prod',
            ),
            array(
                'market' => 'EU',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.sbg.ovh.prod',
            ),
            // 'AF' => array( 'probe1.rbx.ovh.prod', 'probe1.sbg.ovh.prod' ),
            array(
                'market' => 'AF',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.rbx.ovh.prod',
            ),
            array(
                'market' => 'AF',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.sbg.ovh.prod',
            ),
            // 'AS' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
            array(
                'market' => 'AS',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.sin.sl.prod',
            ),
            array(
                'market' => 'AS',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.sjc.sl.prod',
            ),
            // 'OC' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
            array(
                'market' => 'OC',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.sin.sl.prod',
            ),
            array(
                'market' => 'OC',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.sjc.sl.prod',
            ),
            // default, array( 'probe1.atl.tmd.prod', 'probe1.sbg.ovh.prod' )
            array(
                'market' => '',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.atl.tmd.prod',
            ),
            array(
                'market' => '',
                'rand' => array( 0, 1, 1 ),
                'alias' => 'probe1.sbg.ovh.prod',
            ),
        );
        
        foreach ($test_data as $i) {
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
    
    /**
     * @test
     */
    public function service_with_one_object_array()
    {
        $test_data = array(
            // 'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
            array(
                'providers' => array(
                    'probe1.atl.tmd.prod' => '65.254.36.226',
                    'probe1.sbg.ovh.prod' => '37.59.8.25',
                    'probe1.sin.sl.prod' => '119.81.23.243',
                    'probe1.sjc.sl.prod' => '50.97.227.68',
                ),
                'market_map' => array(
                    'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'SA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'EU' => array( 'probe1.sbg.ovh.prod', ),
                    'AF' => array( 'probe1.sbg.ovh.prod', ),
                    'AS' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                    'OC' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                ),
                'market' => 'NA',
                'rand' => array( 0, 1, 0 ),
                'alias' => 'probe1.sjc.sl.prod',
            ),
            array(
                'providers' => array(
                    'probe1.atl.tmd.prod' => '65.254.36.226',
                    'probe1.sbg.ovh.prod' => '37.59.8.25',
                    'probe1.sin.sl.prod' => '119.81.23.243',
                    'probe1.sjc.sl.prod' => '50.97.227.68',
                ),
                'market_map' => array(
                    'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'SA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'EU' => array( 'probe1.sbg.ovh.prod', ),
                    'AF' => array( 'probe1.sbg.ovh.prod', ),
                    'AS' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                    'OC' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                ),
                'market' => 'EU',
                'rand' => array( 0, 0, 0 ),
                'alias' => 'probe1.sbg.ovh.prod',
            ),
            array(
                'providers' => array(
                    'probe1.atl.tmd.prod' => '65.254.36.226',
                    'probe1.sbg.ovh.prod' => '37.59.8.25',
                    'probe1.sin.sl.prod' => '119.81.23.243',
                    'probe1.sjc.sl.prod' => '50.97.227.68',
                ),
                'market_map' => array(
                    'NA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'SA' => array( 'probe1.sjc.sl.prod', 'probe1.atl.tmd.prod' ),
                    'EU' => array( 'probe1.sbg.ovh.prod', ),
                    'AF' => array( 'probe1.sbg.ovh.prod', ),
                    'AS' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                    'OC' => array( 'probe1.sin.sl.prod', 'probe1.sjc.sl.prod' ),
                ),
                'market' => 'AF',
                'rand' => array( 0, 0, 0 ),
                'alias' => 'probe1.sbg.ovh.prod',
            ),
        );
        
        foreach ($test_data as $i) {
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');
            $application = $this->getMock('OpenmixApplication', array('rand'));
            
            $application->providers = $i['providers'];
            $application->market_map = $i['market_map'];
            
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