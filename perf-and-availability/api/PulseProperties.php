<?php

/**
 * These properties allow access to the data provided by the Pulse server.
 *
 * Example::
 *
 *      class OpenmixApplication implements Lifecycle
 *      {
 *          public function init($config)
 *          {
 *              $config->declareInput(PulseProperties::LOAD, "provider1,provider2");
 *              $config->declareInput(PulseProperties::LIVE, "provider1,provider2");
 *          }
 *
 *          public function service($request,$response,$utilities)
 *          {
 *              $pulseLoad = $request->pulse(PulseProperties::LOAD);
 *              $pulseLive = $request->pulse(PulseProperties::LIVE);
 *          }
 *      }
 */
class PulseProperties
{
    /**
     * (string) Contains the contents of a file that the provider loads
     * periodically.  This may be used for dynamic configuration of an
     * Openmix application.
     */
    const LOAD = 'longstring:pload:load';
    
    /**
     * (real) A percentage of the number of Pulse live checks that are positive.
     */
    const LIVE = 'real:plive:live';
}

?>
