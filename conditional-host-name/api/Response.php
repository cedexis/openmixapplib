<?php
/**
 * An object implementing the Response interface is passed to the
 * OpenmixApplication object's service method.
 */
interface Response
{
    /**
     * called when you have a fixed response profile for
     * a given provider
     */
    public function selectProvider($provider);

    /**
     * called when you want to respond with the provider and
     * hostname - equivalent to return "host.name,provider"
     */
    public function respond($provider,$cname);

    /**
     * just sets the cname to return
     */
    public function setCName($cname);

    /**
     * just sets the ttl
     */
    public function setTTL($ttl);

    /**
     * Sets the reason code to one of the values defined by $config->declareReasonCode()
     */
    public function setReasonCode($code);

    /**
     * @param string $signal The name of a signal defined by $config->declareResponseSignal
     * @param mixed $value The value of the signal
     *
     * if location==null, the current request location is used
     */
    public function emitSignal($signal,$value,$location=null);
}
?>
