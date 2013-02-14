<?php

require_once 'TestHelper.php';
require_once(APP_DIR . '/OpenmixApplication.php');

class OpenmixApplicationTests extends PHPUnit_Framework_TestCase
{
    private $providers = array(
                'gs1' => 'origin.customer.net',
                'gs2' => 'www.customer.net.thiscdn.net',
                'gs3' => 'www.customer.net.othercdn.net');
    private $ttl = 20;

    /**
     * @test
     */
    public function init()
    {

        $config = $this->getMock('Configuration');

        $callIndex = 0;
        foreach ($this->providers as $alias => $cname) {
            $config->expects($this->at($callIndex++))
                ->method('declareResponseOption')
                ->with($alias, $cname, $this->ttl);
        }

        $application = new OpenmixApplication();
        $application->init($config);
    }
    
    /**
     * @test
     */
    public function service()
    {
        $testData = array(
            // Test that no exceptions works correctly
            array(
                'exceptions' => array(),
                'candidates' => $this->providers,
                'day' => 'Sun',
                'hour' => 5,
                'alias' => 'gs1'
            ),
            // Test that a time with no exceptions works correctly
            array(
                'exceptions' => array(
                    "Sun" => array(
                        "1"  => array("gs1", "gs2"),
                        "17" => array("gs1")
                    ),
                    "Tue" => array(
                        "13" => array("gs3")
                    )
                ),
                'candidates' => $this->providers,
                'day' => 'Sun',
                'hour' => 5,
                'alias' => 'gs1'
            ),
            // Test that removing all but one candidates works correctly
            array(
                'exceptions' => array(
                    "Sun" => array(
                        "1"  => array("gs1", "gs2"),
                        "17" => array("gs1")
                    ),
                    "Tue" => array(
                        "13" => array("gs3")
                    )
                ),
                'candidates' => $this->providers,
                'day' => 'Sun',
                'hour' => 1,
                'alias' => 'gs3'
            ),
            // Test that removing all candidates works correctly 
            array(
                'exceptions' => array(
                    "Sun" => array(
                        "1"  => array("gs1", "gs2"),
                        "17" => array("gs1")
                    ),
                    "Tue" => array(
                        "13" => array("gs3")
                    ),
                    "Fri" => array(
                        "0" => array("gs1", "gs2", "gs3")
                    )
                ),
                'candidates' => $this->providers,
                'day' => 'Fri',
                'hour' => 0,
                'alias' => null
            ),
            // Test that duplicating exceptions is fine
            array(
                'exceptions' => array(
                    "Sun" => array(
                        "1"  => array("gs1", "gs2"),
                        "17" => array("gs1")
                    ),
                    "Tue" => array(
                        "13" => array("gs3")
                    ),
                    "Fri" => array(
                        "0" => array("gs1", "gs2", "gs3", "gs2", "gs1")
                    )
                ),
                'candidates' => $this->providers,
                'day' => 'Fri',
                'hour' => 0,
                'alias' => null
            )
        );

        $test = 0;
        foreach ($testData as $i) {
            print("\nTest: " . $test++ . "\n");
            $request = $this->getMock('Request');
            $response = $this->getMock('Response');
            $utilities = $this->getMock('Utilities');

            // Test that the expected provider was selected.
            // This tests the logic that we care about.
            $application = new OpenmixApplication();
            $alias = $application->determineProvider($i['exceptions'],
                                                     $i['candidates'],
                                                     $i['day'],
                                                     $i['hour']);
            
            $this->assertEquals($alias, $i['alias']);

            // Call the service method to check it for silly errors
            $application->service($request, $response, $utilities);
        }
    }
}

?>
