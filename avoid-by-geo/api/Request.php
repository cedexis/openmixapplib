<?php
/**
 * An object implementing the Request interface is passed to the
 * OpenmixApplication object's service method.
 */
interface Request
{
    /**
     * @param string $requestProperty One of the constants defined in RequestProperties
     */
    public function request($requestProperty);

    /**
     * @param string $radarProbeType One of the constants defined in RadarProbeTypes
     */
    public function radar($radarProbeType);
    
    /**
     * @param string $geoProperty One of the constants defined in GeoProperties
     */
    public function geo($geoProperty);
    
    /**
     * @param string $bgpProperty One of the constants defined in BgpProperties
     */
    public function bgp($bgpProperty);
    
    /**
     *
     * @param string $pulseProperty One of the constants defined in PulseProperties or RadarProbeTypes
     *
     */
    public function pulse($pulseProperty);
    
    /**
     * @param string $fusionProperty One of the constants defined in FusionProperties
     *
     * returns one of the following:
     *
     */
    public function fusion($fusionProperty);
    
    /**
     * @param string $ankeenaProperty One of the constants defined in AnkeenaProperties
     *
     */
    public function ankeena($ankeenaProperty);

    /**
     * @param string $costFunction one of the cost functions declared by $config->declareAltoCostFunction
     *
     */
    public function alto($costFunction);
}
?>
