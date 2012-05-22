<?php

class RequestProperties
{
    /**
     * (string) This is the "hostname" of the Openmix app that processed the
     * request.  This bears some explanation because it's a bit of a misnomer
     * that has persisted for historical reasons.  It is not necessarily
     * the hostname of the request, as you might think.  Rather it's the **optional**
     * leftmost portion of the Openmix app ID, which you can set to be anything
     * you want when creating CNAME records mapping your subdomain(s) to the
     * Openmix app.  In this way you can have a single Openmix app provide DNS
     * routing for multiple subdomains, and identify the subdomain of the
     * request from within the app.
     *
     * For example, to handle the subdomains www.example.com, video.example.com
     * and downloads.example.com with the Openmix app having an ID of
     * 2-01-29a4-0001.cdx.cedexis.net, you might create CNAME records like this::
     *
     *     www        IN  CNAME  www.2-01-29a4-0001.cdx.cedexis.net
     *     video      IN  CNAME  video.2-01-29a4-0001.cdx.cedexis.net
     *     downloads  IN  CNAME  downloads.2-01-29a4-0001.cdx.cedexis.net
     *
     * From within the app::
     *
     *     class OpenmixApplication implements Lifecycle
     *     {
     *         public function init($config)
     *         {
     *             $config->declareInput(RequestProperties::HOSTNAME);
     *         }
     *         
     *         public function service($request,$response,$utilities)
     *         {
     *             $hostname = $request->request(RequestProperties::HOSTNAME);
     *
     *             // Now $hostname is one of: www, video, downloads.
     *             // You can use this data in your app's business logic.
     *         }
     *     }
     */
    const HOSTNAME = 'string:request:hostname';
    
    /**
     * (string) The IP address of the user's nameserver
     *
     * Example::
     *
     *      $value = $request->request(RequestProperties::IP);
     */
    const IP = 'string:request:ip';
}

?>
