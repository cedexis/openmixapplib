<?php

class RadarProbeTypes
{
    const AVAILABILITY= 'real:score:avail';
    const HTTP_RTT    = 'real:score:http_rtt';
    const HTTP_COLD   = 'real:score:http_cold';
    const HTTP_CUSTOM = 'real:score:http_custom';
    const HTTP_XL     = 'real:score:http_xl';
    const HTTP_KBPS   = 'real:score:http_kbps';
    const RTMP_CONNECT= 'real:score:rtmp_connect';
    const RTMP_BUFFER = 'real:score:rtmp_buffer';
    const RTMP_KBPS   = 'real:score:rtmp_kbps';
    const SSL_RTT     = 'real:score:ssl_rtt';
    const SSL_COLD    = 'real:score:ssl_cold';
    const SSL_CUSTOM  = 'real:score:ssl_custom';
    const SSL_KBPS    = 'real:score:ssl_kbps';
}

?>
