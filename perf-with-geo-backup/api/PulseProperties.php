<?php

/**
 * These properties allow access to the data provided by the pulserver.
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
    const LOAD = 'longstring:pload:load';
    const LIVE = 'real:plive:live';
}

?>
