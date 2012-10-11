<?php
/**
 * An object implementing the Response interface is passed to the
 * OpenmixApplication object's service method.
 */
interface Response
{
    /**
     * Called when you have a fixed response profile for a given provider.
     *
     * Example::
     *
     *      $response->selectProvider('provider_a');
     */
    public function selectProvider($provider);

    /**
     * Called when you want to respond with the provider and hostname - equivalent to return "host.name,provider"
     *
     * Example::
     *
     *      $response->respond('provider_a', 'a.example.com');
     */
    public function respond($provider,$cname);

    /**
     * Override the CNAME to return. This method is only effective if called **after**
     * `$utilities->selectRandom()` or `$response->selectProvider()` are called.
     *
     * Example::
     *
     *      $response->setCName('other.example.com');
     */
    public function setCName($cname);

    /**
     * Override the TTL to return.
     *
     * Example::
     *
     *      $response->setTTL(100);
     */
    public function setTTL($ttl);

    /**
     * Sets the reason code to one of the values defined by $config->declareReasonCode().
     *
     * Example::
     *
     *      $response->setReasonCode('A');
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
