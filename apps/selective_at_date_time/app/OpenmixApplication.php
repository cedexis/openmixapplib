<?php

class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     */
    public $providers = array(
        'gs1' => 'origin.customer.net',
        'gs2' => 'www.customer.net.thiscdn.net',
        'gs3' => 'www.customer.net.othercdn.net');
    
    private $ttl = 20;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        
        // This example uses a text object already in the script, but you
        // could use Fusion Custom to load the data with code like this.
        //
        // The file loaded by Fusion Custom is expected to be associated
        // only with the origin platform.
        /*** Fusion Custom code
        $config->declareInput(
            PulseProperties::LOAD,
            'gs1');
         ***/

        // Let Openmix know what to expect as response options.
        foreach ($this->providers as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     */
    public function service($request, $response, $utilities)
    {
        // Grab the current UTC day of the week and hour of the day to use
        // for looking up exceptions below.
        $hour = gmdate('G', time());
        $day = gmdate('D', time());

        // Decode the exceptions into an associative array
        //
        // This example uses a text object already in the script, but you
        // could use Fusion Custom to load the data with code like this.
        //
        //$allExceptions = $request->pulse(PulseProperties::LOAD);

        // Build up an `array` from the CSV object containing exceptions
        $timeBasedExceptions = array();
        $lines = preg_split("/((\r?\n)|(\r\n?))/", $this->allExceptions);
        foreach ($lines as $line) {
            $fields = explode(',', $line);
            // See if the day-level key already exists
            if (array_key_exists($fields[0], $timeBasedExceptions)) {
                // The day-level key exists, does the hour-level key?
                if (array_key_exists($fields[1], $timeBasedExceptions[$fields[0]])) {
                    // Both day-level and hour-level arrays exist already, append to
                    // the existing array
                    array_push($timeBasedExceptions[$fields[0]][$fields[1]], $fields[2]);
                }
                else {
                    // The day-level key exists but not the hour-level key
            //            array_push($timeBasedExceptions[$fields[0]], array($fields[1] => array($fields[2])));
                    $timeBasedExceptions[$fields[0]][$fields[1]] = array($fields[2]);
                }
            }
            else {
                // Day-level array doesn't exist, so add it with the value for this hour
                $timeBasedExceptions[$fields[0]] = array($fields[1] => array($fields[2]));
            }
        }

        // Determine the provider
        $alias = $this->determineProvider($timeBasedExceptions,
                                          $this->providers,
                                          $day,
                                          $hour);

        // Hand back a DNS response
        if (isset($alias)) {
            $response->selectProvider($alias);
        }
        else {
            // No candidates so pick a random provider from the full list.
            $utilities->selectRandom();
        }
    }

    public function determineProvider($timeBasedExceptions, $candidates, $day, $hour) {
        // Find and remove any exceptions for this day and hour. The provider
        // name loaded the exception list is assumed to be a key in
        // `$this->providers`.

        // First, check that there are exceptions for this day and time
        if (isset($timeBasedExceptions)
            && isset($candidates)
            && array_key_exists($day, $timeBasedExceptions)
            && array_key_exists($hour, $timeBasedExceptions[$day]))
        {
            // An entry for this day and hour exists, treat the value as an
            // array and iterate over it. 
            foreach ($timeBasedExceptions[$day][$hour] as $alias)
            {
                // Remove this excepted alias from the list of candidates
                unset($candidates[$alias]);
            }
        }

        ////
        // Add your chosen selection method here instead of selecting the
        // first available candidate.
        ////
        if (count($candidates) > 0) {
            reset($candidates);
            return key($candidates);
        }
        else {
            // No candidates so pick a random provider from the full list.
            return null;
        }
    }

    // This data could be loaded using Fusion Custom so that it could be more
    // easily updated. It is coded into the script as a demonstration only.
    //
    // The data is in CSV format and structured as:
    //      DAY,HR,ALIAS
    //      DAY,HR,ALIAS
    //      ...
    //      DAY,HR,ALIAS
    //
    // where "DAY" is the three character day of the week produced by
    // the PHP `date` function with the `'D'` format code, "HR" is the hour of
    // the day produced by the PHP `date` function with the `'G'`
    // format code, and "ALIAS" is a single alias from the `$providers`
    // array.
    //
    // All times and days are in UTC.
    //
    public $allExceptions = <<<FLAT
Sun,1,gs1
Sun,1,gs2
Sun,17,gs1
Tue,13,gs3
FLAT;

}
?>
