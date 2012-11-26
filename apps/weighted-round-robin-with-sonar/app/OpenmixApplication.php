<?php
/**
 * Select randomly from a set of weighted providers while taking Sonar scores
 * into account.
 */
class OpenmixApplication implements Lifecycle
{
    // The array of all possible responses. The key, e.g. 'provider1', is the
    // label for the platform. The value, e.g. 'cname1.foo.com' is the CNAME
    // to hand back when that platform is selected.
    private $providers = array(
    	'provider1' => 'cname1.foo.com',
        'provider2' => 'cname2.foo.com',
        'provider3' => 'cname3.foo.com'
        );

    // Establish the weight for each possible response. There should be a 1:1
    // correspondance with the list of weights in `$providers`.
    private $weights = array(
    	'provider1' => 50,
        'provider2' => 30,
        'provider3' => 20
    	);


    // Set the Sonar threshold for availability for the platform to be
    // included.
    private $sonarThreshold = 95;

    // The DNS TTL to be applied to DNS responses in seconds.
    private $ttl = 20;

    // The possible reasons for specific decisions
    private $reasons = array(
        'A' => 'Routed randomly by weight',
        'B' => 'Most available platform chosen',
        'C' => 'Choose a random platform'
        );

   /**
   * @param Configuration $config
   */
   public function init($config)
    {
        //Register SONAR Liveness check for all keys in `$providers`
        $config->declareInput(PulseProperties::SONAR,
                              implode(',',array_keys($this->providers)));

        // Register the providers that will be selected from
        foreach ($this->providers as $akey => $cname) {
            $config->declareResponseOption($akey, $cname, $this->ttl);
        }

        // Register the possible reasons for decisions
        foreach ($this->reasons as $code => $explanation) {
            $config->declareReasonCode($code);
        }
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     */
   public function service($request,$response,$utilities)
    {
        // Grab the latest Sonar data
        $sonar = $request->pulse(PulseProperties::SONAR);

        // Make a copy of the `$weights` array to treat as candidates
        $candidates = $this->weights;

        // See if there is any Sonar data
        if (is_array($sonar)) {
            // Sonar data is available, so loop through all candidates and
            // remove any that don't meet the Sonar threshold
            foreach (array_keys($candidates) as $akey) {
                if ($sonar[$akey] <= $this->sonarThreshold) {
                    unset($candidates[$akey]);
                }
            }
	}

        // Respond with a weighted random selection from the remaining
        // candidates. Do this by summing the weights of the remaining
        // candidates and then choose a random number within that sum,
        // selecting the candidate with the encompassing that part of the
        // range.
        $totalWeight = array_sum($candidates);
        $random = $this->rand(0, $totalWeight - 1);

        // Guard against no candidates still being in the list
      	if ($random < 0) $random=0;

        // `$mark` is the high water mark for finding the candidate with the
        // appropriate weight correponding to `$random`. Start at zero. 
        $mark = 0;
        foreach ($candidates as $akey => $weight) {
            // Add this candidate's weight to mark
            $mark += $weight;

            // Check whether this candidate pushed `$mark` past `$random`. If
            // so then respond with the current candidate. 
            if ($random < $mark) {
                $response->setReasonCode('A');
                $response->selectProvider($akey);
                return;
            }
    	}

        // This code is only reached if there is no candidate exceeding the
        // `$sonarThreshold`.
        if (is_array($sonar)) {
            // Since there is Sonar data, pick the most Sonar-available
            // candidate.
            arsort($sonar);
            $response->selectProvider(key($sonar));
            $response->setReasonCode('B');
        }
        else {
            // There is no Sonar data and no candidates. This should never
            // happen, but just in case.
            $response->setReasonCode('C');
            $utilities->selectRandom();
        }
    }

    /**
     * This method just wraps the PHP rand function, but provides
     * a seam that can be used in unit testing.
     */
 public function rand($min, $max)
    	{
    	    return rand($min, $max);
    	}


}
?>
