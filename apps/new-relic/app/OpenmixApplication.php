<?php

class OpenmixApplication implements Lifecycle
{
    // The array of platforms in use by this application
    private $platforms = array(
        'datacenter_a' => 'datacenter_a.example.com',
        'datacenter_b' => 'datacenter_b.example.com'
    );

    private $ttl = 20;
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        // Declare the possible responses from this application
        foreach ($this->platforms as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }

        // Declare the desire for New Relic CPU data
        $config->declareInput(NewrelicProperties::CPU, 'datacenter_a');
    }
    
    /**
     * This application is very simple in order to highlight the New 
     * Relic-specific parts of the functionality. If the CPU for "datacenter_a" 
     * is over 1.0 then all traffic is sent to "datacenter_b". Otherwise the 
     * destination is selected at random.
     * 
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        // Grab the array of New Relic CPU data for this request
        $newRelicCPU = $request->newrelic(NewrelicProperties::CPU);

        // If "datacenter_a"'s CPU metric is above 1.0 then use "datacenter_b"
        if ($newRelicCPU['datacenter_a'] > 1.0) {
            $response->selectProvider('datacenter_b');
            return;
        }

        // "datacenter_a"'s CPU metric is below 1.0 so choose randomly
        $utilities->selectRandom();
    }
}

?>
