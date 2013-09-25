<?php
/**
 * Contains constants used to query Fusion reporting data.
 */
class FusionProperties
{
    /**
     * *(string)* Contains the contents of a file that the provider loads
     * periodically.  This may be used for dynamic configuration of an
     * Openmix application.
     *
     * Example::
     *
     *      $data = $request->pulse(FusionProperties::CUSTOM);
     *
     *      // $data now points to an object like:
     *      // array(
     *      //     <provider 1 alias>: <string>,
     *      //     <provider 2 alias>: <string>,
     *      //     <provider 3 alias>: <string>
     *      // );
     *
     */
    const CUSTOM = 'longstring:pload:load';

    /**
     * *(real)* The mount of content delivered by this provider since the beginning
     * of the month.
     *
     * Example::
     *
     *      $value = $request->fusion(FusionProperties::GB);
     */
    const GB  ='real:fusion:gb';
    
    /**
     * *(real)* The rate of content being delivered by this provider right now.
     *
     * Example::
     *
     *      $value = $request->fusion(FusionProperties::MBPS);
     */
    const MBPS='real:fusion:mbps';
}

?>
