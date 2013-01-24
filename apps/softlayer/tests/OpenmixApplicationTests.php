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

        $config->expects($this->at(0))
            ->method('declareResponseOption')
            ->with('softlayer_a', 'providerA.example.com');

        $config->expects($this->at(1))
            ->method('declareResponseOption')
            ->with('softlayer_b', 'providerB.example.com');

        $config->expects($this->at(2))
            ->method('declareInput')
            ->with(PulseProperties::LOAD, 'softlayer_a');

        $application = new OpenmixApplication();
        $application->init($config);
    }

    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // softlayer_a primary network component ACTIVE
            array('pulse' => array('softlayer_a' => '{"createDate":"2013-01-23T15:37:36-08:00","guestId":1410652,"id":999427,"macAddress":"06:9f:43:04:ec:62","maxSpeed":10,"modifyDate":"2013-01-24T12:04:45-08:00","name":"eth","networkId":783589,"port":1,"speed":10,"status":"ACTIVE","uuid":"c9a71453-e60c-a2bb-f8f7-b2a1fc23b9cc","primaryIpAddress":"50.97.227.68"}')),
            // softlayer_a primary network component DISABLED
            array(
                'pulse' => array('softlayer_a' => '{"createDate":"2013-01-23T15:37:36-08:00","guestId":1410652,"id":999427,"macAddress":"06:9f:43:04:ec:62","maxSpeed":10,"modifyDate":"2013-01-24T12:04:09-08:00","name":"eth","networkId":783589,"port":1,"speed":10,"status":"DISABLED","primaryIpAddress":"50.97.227.68"}'),
                'alias' => 'softlayer_b'
            ),
        );

        $test = 0;
        foreach ($testData as $i) {
            print("\n\nTest " . $test++);
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');

            $request->expects($this->once())
                ->method('pulse')
                ->with(PulseProperties::LOAD)
                ->will($this->returnValue($i['pulse']));

            if (array_key_exists('alias', $i)) {
                $response->expects($this->once())
                    ->method('selectProvider')
                    ->with($i['alias']);

                $utilities->expects($this->never())
                    ->method('selectRandom');
            } else {
                $utilities->expects($this->once())
                    ->method('selectRandom');

                $response->expects($this->never())
                    ->method('selectProvider');
            }

            $application = new OpenmixApplication();
            $application->service($request, $response, $utilities);
            $this->verifyMockObjects();
        }
    }
}

?>
