<?php
/**
 * Contains constants used to make requests for Newrelic properties
 *
 * Example::
 *
 *      public function service($request, $response, $utilities)
 *      {
 *          $cpu = $request->monitors(MonitorsProperties::CATCHPOINT);
 *      }
 */
class MonitorsProperties
{
    /**
     * (integer) Catchpoint node number for request, if applicable (or 0)
     */
    const CATCHPOINT                         = 'integer:benchmark:catchpoint';

    /**
     * (integer) Catchpoint node number for request, if applicable (or 0)
     */
    const KEYNOTE                         = 'integer:benchmark:keynote';

    /**
     * (integer) Catchpoint node number for request, if applicable (or 0)
     */
    const GOMEZ                         = 'integer:benchmark:gomez';
}
?>
