<?php

/**
 * AppDynamics is an APM vendor focused on enterprise Java and .NET web applications.
 * This app demonstrates using real time data from AppDynamics for decision making.
 * Using FusionCustom, we will dynamically collect server health stats using a collector using
 * basic HTTP authentication. This is a very simple example using current CPU threshold
 * to switch between hosts. Refer to the wiki for details on URLs etc.
 */
class OpenmixApplication implements Lifecycle
{
    private $targets = array(
        'appdynamics_a' => 'targetA.example.com',
        'appdynamics_b' => 'targetB.example.com'
    );

    private $thresholds = array(
        'appdynamics_a' => 200.0
    );

    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        foreach ($this->targets as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, 20);
        }
        $config->declareInput(PulseProperties::LOAD, implode(',', array_keys($this->thresholds)));
    }

    /**
     * If we exceed the current CPU threshold on a target,
     * remove it from the candidates.
     * If only one candidate remains, select it.
     * If both are healthy, round robin.
     *
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request, $response, $utilities)
    {
        $fusionCustomData = $request->pulse(PulseProperties::LOAD);

        if (!is_null($fusionCustomData)) {
            $fusionCustomData = array_intersect_key($fusionCustomData, $this->thresholds);

            // Pre-populate $candidates with targets for which we have not
            // specified a threshold
            $candidates = array('appdynamics_b');

            foreach ($fusionCustomData as $alias => $value) {
                if (1 == preg_match("/\"current\":\s+([\d.]+)/i", $value, $matches)) {
                    $load = floatval($matches[1]);
                    if ($load < $this->thresholds[$alias]) {
                        array_push($candidates, $alias);
                    }
                }
            }

            $candidatesCount = count($candidates);

            if (1 == $candidatesCount) {
                $response->selectProvider($candidates[0]);
                return;
            }
        }
        $utilities->selectRandom();
    }
}

?>
