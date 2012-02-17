<?php

class RadarProbeTypes
{
    /**
     * (real) Percentage of successful visits; returns a number from 0-100
     */
    const AVAILABILITY= 'real:score:avail';
    
    /**
     * (real) Response time
     */
    const HTTP_RTT    = 'real:score:http_rtt';
    
    /**
     * (real) Connect time
     */
    const HTTP_COLD   = 'real:score:http_cold';
    
    /**
     * (real) Time to load a custom probe
     */
    const HTTP_CUSTOM = 'real:score:http_custom';
    
    /**
     *
     */
    const HTTP_XL     = 'real:score:http_xl';
    
    /**
     * (real) Measures throughput time for large objects, generally 100KB
     */
    const HTTP_KBPS   = 'real:score:http_kbps';
    
    /**
     * (real) Internet streaming connect time
     */
    const RTMP_CONNECT= 'real:score:rtmp_connect';
    
    /**
     * (real) Internet streaming time to buffer
     */
    const RTMP_BUFFER = 'real:score:rtmp_buffer';
    
    /**
     * (real) Internet streaming throughput
     */
    const RTMP_KBPS   = 'real:score:rtmp_kbps';
    
    /**
     * (real) Response time for secure requests
     */
    const SSL_RTT     = 'real:score:ssl_rtt';
    
    /**
     * (real) Connect time for secure requests
     */
    const SSL_COLD    = 'real:score:ssl_cold';
    
    /**
     * (real) Time to load a custom probe over a secure connection.
     */
    const SSL_CUSTOM  = 'real:score:ssl_custom';
    
    /**
     * (real) Measures throughput time for large objects served over a secure connection,
     * generally 100KB
     */
    const SSL_KBPS    = 'real:score:ssl_kbps';
}

?>
