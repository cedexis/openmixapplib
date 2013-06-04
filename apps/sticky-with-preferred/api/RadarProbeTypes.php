<?php

class RadarProbeTypes
{
    /**
     * *(real)* Redirect time measured using the Navigation Timing API for requests
     * over HTTPS.
     *
     * Defined as: fetchStart - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_REDIRECT);
     */
    const SSL_NAV_REDIRECT = 'real:score:ssl_nav_redirect';
    
    /**
     * *(real)* Playback bitrate for RTMP.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::RTMP_PLAYBACK_KBPS);
     */
    const RTMP_PLAYBACK_KBPS = 'real:score:rtmp_playback_kbps';
    
    /**
     * *(real)* Total page load time measured using the Navigation Timinig API.
     *
     * Defined as: loadEventEnd - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_PAGELOAD);
     */
    const HTTP_NAV_PAGELOAD = 'real:score:http_nav_pageload';

    /**
     * *(real)* Redirect time measured using the Navigation Timinig API.
     *
     * Defined as: fetchStart - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_REDIRECT);
     */
    const HTTP_NAV_REDIRECT = 'real:score:http_nav_redirect';

    /**
     * *(real)* DNS lookup time measured using the Navigation Timinig API.
     *
     * Defined as: domainLookupEnd - domainLookupStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_DNSLOOKUP);
     */
    const HTTP_NAV_DNSLOOKUP = 'real:score:http_nav_dnslookup';

    /**
     * *(real)* Connect time measured using the Navigation Timinig API.
     *
     * Defined as: connectEnd - connectStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_CONNECT);
     */
    const HTTP_NAV_CONNECT = 'real:score:http_nav_connect';

    /**
     * *(real)* Send time measured using the Navigation Timinig API.
     *
     * Defined as: responseStart - requestStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_SEND);
     */
    const HTTP_NAV_SEND = 'real:score:http_nav_send';

    /**
     * *(real)* Percentage of successful visits for HTTP streaming requests; returns
     * a number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_AVAIL);
     */
    const STREAM_AVAIL = 'real:score:stream_avail';

    /**
     * *(real)* DOM load time measured using the Navigation Timinig API.
     * 
     * Defined as: domComplete - domLoading
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_DOM);
     */
    const HTTP_NAV_DOM = 'real:score:http_nav_dom';

    /**
     * *(real)* Load event time measured using the Navigation Timinig API.
     *
     * Defined as: loadEventEnd - loadEventStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_LOADEVENT);
     */
    const HTTP_NAV_LOADEVENT = 'real:score:http_nav_loadevent';

    /**
     * *(real)* Total page load time measured using the Navigation Timinig API for
     * mobile networks.
     *
     * Defined as: loadEventEnd - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_PAGELOAD_MOB);
     */
    const HTTP_NAV_PAGELOAD_MOB = 'real:score:http_nav_pageload_mob';

    /**
     * *(real)* Redirect time measured using the Navigation Timinig API for mobile
     * networks.
     *
     * Defined as: fetchStart - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_REDIRECT_MOB);
     */
    const HTTP_NAV_REDIRECT_MOB = 'real:score:http_nav_redirect_mob';

    /**
     * *(real)* Send time measured using the Navigation Timing API for requests over
     * HTTPS.
     *
     * Defined as: responseStart - requestStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_SEND);
     */
    const SSL_NAV_SEND = 'real:score:ssl_nav_send';

    /**
     * *(real)* Receive time measured using the Navigation Timing API for requests
     * over HTTPS.
     *
     * Defined as: responseEnd - responseStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_RECEIVE);
     */
    const SSL_NAV_RECEIVE = 'real:score:ssl_nav_receive';

    /**
     * *(real)* DNS lookup time measured using the Navigation Timing API for
     * requests over HTTPS on mobile networks.
     *
     * Defined as: domainLookupEnd - domainLookupStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_DNSLOOKUP_MOB);
     */
    const SSL_NAV_DNSLOOKUP_MOB = 'real:score:ssl_nav_dnslookup_mob';

    /**
     * *(real)* Playback bitrate for HTTP streaming.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_PLAYBACK_KBPS);
     */
    const STREAM_PLAYBACK_KBPS = 'real:score:stream_playback_kbps';

    /**
     * *(real)* Total page load time measured using the Navigation Timinig API for
     * requests over HTTPS on mobile networks.
     *
     * Defined as: loadEventEnd - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_PAGELOAD_MOB);
     */
    const SSL_NAV_PAGELOAD_MOB = 'real:score:ssl_nav_pageload_mob';

    /**
     * *(real)* Redirect time measured using the Navigation Timinig API for requests
     * over HTTPS on mobile networks.
     *
     * Defined as: fetchStart - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_REDIRECT_MOB);
     */
    const SSL_NAV_REDIRECT_MOB = 'real:score:ssl_nav_redirect_mob';

    /**
     * *(real)* Time to load a custom probe on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_CUSTOM_MOB);
     */
    const HTTP_CUSTOM_MOB = 'real:score:http_custom_mob';
    
    /**
     * *(real)* Percentage of successful visits for requests over HTTPS on mobile
     * networks; returns a number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_AVAIL_MOB);
     */
    const SSL_AVAIL_MOB = 'real:score:ssl_avail_mob';

    /**
     * *(real)* Percentage of successful visits on mobile networks; returns a number
     * from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_AVAIL_MOB);
     */
    const HTTP_AVAIL_MOB = 'real:score:http_avail_mob';

    /**
     * *(real)* Time to connect and warm any CDN caches on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_COLD_MOB);
     */
    const HTTP_COLD_MOB = 'real:score:http_cold_mob';

    /**
     * *(real)* Response time for mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_RTT_MOB);
     */
    const HTTP_RTT_MOB = 'real:score:http_rtt_mob';

    /**
     * *(real)* Measures throughput time for large objects, generally 100KB, on
     * mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_KBPS_MOB);
     */
    const HTTP_KBPS_MOB = 'real:score:http_kbps_mob';
    
    /**
     * *(real)* Time to connect and warm any CDN caches for requests over HTTPS on
     * mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_COLD_MOB);
     */
    const SSL_COLD_MOB = 'real:score:ssl_cold_mob';

    /**
     * *(real)* Response time for requests over HTTPS on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_RTT_MOB);
     */
    const SSL_RTT_MOB = 'real:score:ssl_rtt_mob';
    
    /**
     * *(real)* Time to connect and warm any CDN caches.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_COLD);
     */
    const HTTP_COLD = 'real:score:http_cold';

    /**
     * *(real)* Response time.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_RTT);
     */
    const HTTP_RTT = 'real:score:http_rtt';

    /**
     * *(real)* Percentage of successful visits; returns a number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::AVAILABILITY);
     */
    const AVAILABILITY = 'real:score:avail';
    
    /**
     * Synonym for RadarProbeTypes::AVAILABILITY.
     */
    const AVAIL = 'real:score:avail';

    /**
     * *(real)* Time to load a custom probe.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_CUSTOM);
     */
    const HTTP_CUSTOM = 'real:score:http_custom';

    /**
     * *(real)* RTMP connect time.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::RTMP_CONNECT);
     */
    const RTMP_CONNECT = 'real:score:rtmp_connect';
    
    /**
     * *(real)* Throughput for RTMP.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::RTMP_KBPS);
     */
    const RTMP_KBPS = 'real:score:rtmp_kbps';

    /**
     * *(real)* Buffer events per minute for RTMP.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::RTMP_BUFFER);
     */
    const RTMP_BUFFER = 'real:score:rtmp_buffer';

    /**
     * *(real)* Percentage of successful visits for RTMP; returns a number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::RTMP_AVAIL);
     */
    const RTMP_AVAIL = 'real:score:rtmp_avail';

    /**
     * *(real)* Buffer events per minute for HTTP streaming.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_BUFFER);
     */
    const STREAM_BUFFER = 'real:score:stream_buffer';

    /**
     * *(real)* Connect time measured using the Navigation Timinig API for requests
     * over HTTPS on mobile networks.
     *
     * Defined as: connectEnd - connectStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_CONNECT_MOB);
     */
    const SSL_NAV_CONNECT_MOB = 'real:score:ssl_nav_connect_mob';

    /**
     * *(real)* DOM load time measured using the Navigation Timinig API for requests
     * over HTTPS.
     *
     * Defined as: domComplete - domLoading
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_DOM);
     */
    const SSL_NAV_DOM = 'real:score:ssl_nav_dom';

    /**
     * *(real)* Receive time measured using the Navigation Timing API for requests
     * over HTTPS on mobile networks.
     *
     * Defined as: responseEnd - responseStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_RECEIVE_MOB);
     */
    const SSL_NAV_RECEIVE_MOB = 'real:score:ssl_nav_receive_mob';

    /**
     * *(real)* Load event time measured using the Navigation Timinig API for
     * requests over HTTPS.
     *
     * Defined as: loadEventEnd - loadEventStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_LOADEVENT);
     */
    const SSL_NAV_LOADEVENT = 'real:score:ssl_nav_loadevent';

    /**
     * *(real)* Playback bitrate for HTTP streaming on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_PLAYBACK_KBPS_MOB);
     */
    const STREAM_PLAYBACK_KBPS_MOB = 'real:score:stream_playback_kbps_mob';

    /**
     * *(real)* Receive time measured using the Navigation Timing API.
     *
     * Defined as: responseEnd - responseStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_RECEIVE);
     */
    const HTTP_NAV_RECEIVE = 'real:score:http_nav_receive';

    /**
     * *(real)* Total page load time measured using the Navigation Timinig API for
     * requests over HTTPS.
     *
     * Defined as: loadEventEnd - navigationStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_PAGELOAD);
     */
    const SSL_NAV_PAGELOAD = 'real:score:ssl_nav_pageload';

    /**
     * *(real)* Load event time measured using the Navigation Timinig API on mobile
     * networks.
     *
     * Defined as: loadEventEnd - loadEventStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_LOADEVENT_MOB);
     */
    const HTTP_NAV_LOADEVENT_MOB = 'real:score:http_nav_loadevent_mob';

    /**
     * *(real)* HTTP streaming throughput on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_KBPS_MOB);
     */
    const STREAM_KBPS_MOB = 'real:score:stream_kbps_mob';

    /**
     * *(real)* Receive time measured using the Navigation Timing API on mobile
     * networks.
     *
     * Defined as: responseEnd - responseStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_RECEIVE_MOB);
     */
    const HTTP_NAV_RECEIVE_MOB = 'real:score:http_nav_receive_mob';

    /**
     * *(real)* Send time measured using the Navigation Timinig API on mobile networks.
     *
     * Defined as: responseStart - requestStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_SEND_MOB);
     */
    const HTTP_NAV_SEND_MOB = 'real:score:http_nav_send_mob';

    /**
     * *(real)* Connect time measured using the Navigation Timinig API for mobile
     * networks.
     *
     * Defined as: connectEnd - connectStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_CONNECT_MOB);
     */
    const HTTP_NAV_CONNECT_MOB = 'real:score:http_nav_connect_mob';

    /**
     * *(real)* DNS lookup time measured using the Navigation Timinig API for
     * mobile networks.
     *
     * Defined as: domainLookupEnd - domainLookupStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_DNSLOOKUP_MOB);
     */
    const HTTP_NAV_DNSLOOKUP_MOB = 'real:score:http_nav_dnslookup_mob';

    /**
     * *(real)* Load event time measured using the Navigation Timinig API for
     * requests over HTTPS on mobile networks.
     *
     * Defined as: loadEventEnd - loadEventStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_LOADEVENT_MOB);
     */
    const SSL_NAV_LOADEVENT_MOB = 'real:score:ssl_nav_loadevent_mob';

    /**
     * *(real)* DOM load time measured using the Navigation Timinig API for requests
     * over HTTPS on mobile networks.
     *
     * Defined as: domComplete - domLoading
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_DOM_MOB);
     */
    const SSL_NAV_DOM_MOB = 'real:score:ssl_nav_dom_mob';

    /**
     * *(real)* Connect time measured using the Navigation Timinig API for requests
     * over HTTPS.
     *
     * Defined as: connectEnd - connectStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_CONNECT);
     */
    const SSL_NAV_CONNECT = 'real:score:ssl_nav_connect';

    /**
     * *(real)* DNS lookup time measured using the Navigation Timinig API for
     * requests over HTTPS.
     *
     * Defined as: domainLookupEnd - domainLookupStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_DNSLOOKUP);
     */
    const SSL_NAV_DNSLOOKUP = 'real:score:ssl_nav_dnslookup';

    /**
     * *(real)* Time to connect and warm any CDN caches for requests over HTTPS.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_COLD);
     */
    const SSL_COLD = 'real:score:ssl_cold';

    /**
     * *(real)* Response time for requests over HTTPS.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_RTT);
     */
    const SSL_RTT = 'real:score:ssl_rtt';

    /**
     * *(real)* Percentage of successful visits for requests over HTTPS; returns a
     * number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_AVAIL);
     */
    const SSL_AVAIL = 'real:score:ssl_avail';

    /**
     * *(real)* Time to load a custom probe for requests over HTTPS.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_CUSTOM);
     */
    const SSL_CUSTOM = 'real:score:ssl_custom';

    /**
     * *(real)* Measures throughput time for large objects, generally 100KB, for
     * requests over HTTPS.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_KBPS);
     */
    const SSL_KBPS = 'real:score:ssl_kbps';

    /**
     * *(real)* Measures throughput time for large objects, generally 100KB
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_KBPS);
     */
    const HTTP_KBPS = 'real:score:http_kbps';
    
    /**
     * *(real)* Time to load a custom probe for requests over HTTPS on mobile
     * networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_CUSTOM_MOB);
     */
    const SSL_CUSTOM_MOB = 'real:score:ssl_custom_mob';

    /**
     * *(real)* Measures throughput time for large objects, generally 100KB, for
     * requests over HTTPS on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_KBPS_MOB);
     */
    const SSL_KBPS_MOB = 'real:score:ssl_kbps_mob';

    /**
     * *(real)* Buffer events per minute for HTTP streaming on mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_BUFFER_MOB);
     */
    const STREAM_BUFFER_MOB = 'real:score:stream_buffer_mob';

    /**
     * *(real)* Time to connect and warm any CDN caches for HTTP streaming on
     * mobile networks.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_COLD_MOB);
     */
    const STREAM_COLD_MOB = 'real:score:stream_cold_mob';

    /**
     * *(real)* Percentage of successful visits for HTTP streaming on mobile
     * networks; returns a number from 0-100.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_AVAIL_MOB);
     */
    const STREAM_AVAIL_MOB = 'real:score:stream_avail_mob';

    /**
     * *(real)* HTTP streaming throughput.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_KBPS);
     */
    const STREAM_KBPS = 'real:score:stream_kbps';
    
    /**
     * *(real)* DOM load time measured using the Navigation Timinig API on mobile
     * networks.
     *
     * Defined as: domComplete - domLoading
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::HTTP_NAV_DOM_MOB);
     */
    const HTTP_NAV_DOM_MOB = 'real:score:http_nav_dom_mob';

    /**
     * *(real)* Send time measured using the Navigation Timinig API for requests
     * over HTTPS on mobile networks.
     *
     * Defined as: responseStart - requestStart
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::SSL_NAV_SEND_MOB);
     */
    const SSL_NAV_SEND_MOB = 'real:score:ssl_nav_send_mob';
    
    /**
     * *(real)* Time to connect and warm any CDN caches for HTTP streaming.
     *
     * Example::
     *
     *      $value = $request->radar(RadarProbeTypes::STREAM_COLD);
     */
    const STREAM_COLD = 'real:score:stream_cold';
}

?>
