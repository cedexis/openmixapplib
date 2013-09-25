<?php
/**
 * Contains constants used to make requests for Newrelic properties
 *
 * Example::
 *
 *      public function service($request, $response, $utilities)
 *      {
 *          $cpu = $request->fusion(RackSpaceProperties::CPU);
 *      }
 */
class RackSpaceProperties
{
    /**
     * *(real)* CPU value returned from Rackspace
     */
    const CPU                  = 'real:newrelic:cpu';

    /**
     * *(real)* Memory value returned from Rackspace
     */
    const MEMORY                 = 'real:newrelic:memory';

    /**
     * *(real)* Response time returned from Rackspace
     */
    const RXBYTES                   = 'real:newrelic:response_time';

    /**
     * *(real)* Throughput value returned from Rackspace
     */
    const TXBYTES                  = 'real:newrelic:throughput';
}
?>
