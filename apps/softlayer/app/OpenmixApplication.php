<?php

class OpenmixApplication implements Lifecycle
{
    private $providers = array(
        'softlayer_a' => 'providerA.example.com',
        'softlayer_b' => 'providerB.example.com'
    );

    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        foreach ($this->providers as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, 20);
        }
        $config->declareInput(PulseProperties::LOAD, 'softlayer_a');
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request, $response, $utilities)
    {
        $pulseData = $request->pulse(PulseProperties::LOAD);

        // Pre-populate $candidates with providers for which we have not
        // specified a threshold
        $candidates = array('softlayer_b');

        // Assume the network port is enabled to begin with. This deals with missing data issues. 
        $eth1_enabled = TRUE;
        foreach ($pulseData as $alias => $value) {
            if (1 == preg_match("/\"port\":1.*\"status\":\"DISABLED\"/", $value, $matches)) {
                $eth1_enabled = FALSE;
            }
        }

        // Only add softlayer_a if eth1 is enabled
        if ($eth1_enabled) {
            array_push($candidates, 'softlayer_a');
        }

        $candidatesCount = count($candidates);

        if (1 == $candidatesCount) {
            $response->selectProvider($candidates[0]);
            return;
        }
        $utilities->selectRandom();

    }
}

?>
