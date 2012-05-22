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
    public function service()
    {
        $request = $this->getMock('Request');
        $response = $this->getMock('Response');
        $utilities = $this->getMock('Utilities');
        
        $application = new OpenmixApplication();
        $application->service($request, $response, $utilities);
    }
}

?>