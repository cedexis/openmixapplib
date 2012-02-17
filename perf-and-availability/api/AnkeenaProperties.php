<?php

/**
 * Contains constants used to make requests for Ankeena properties
 *
 * Example::
 *
 *      public function service($request, $response, $utilities)
 *      {
 *          $numConnections = $request->ankeena(AnkeenaProperties::TOTAL_ACTIVE_CONNS);
 *      }
 */
class AnkeenaProperties
{
    /**
     * (boolean) Set to true if data was recently fetched, false if the last fetch failed.
     */
    const ALIVE                         = 'boolean:ankeena:alive';
    
    /**
     * (real) Average Cache Bandwidth (MB/Sec)
     */
    const AVG_CACHE_BW                  = 'real:ankeena:avg_cache_bw';
    
    /**
     * (real) Average Connection Rate (per Sec)
     */
    const AVG_CONN_RATE                 = 'real:ankeena:avg_conn_rate';
    
    /**
     * (real) Average CPU Utilization (%)
     */
    const AVG_CPU                       = 'real:ankeena:avg_cpu';
    
    /**
     * (real) Average Disk Bandwidth (MB/Sec)
     */
    const AVG_DISK_BW                   = 'real:ankeena:avg_disk_bw';
    
    /**
     * (real) Average HTTP Transaction Rate(per Sec)
     */
    const AVG_HTTP_TXN                  = 'real:ankeena:avg_http_txn';
    
    /**
     * (real) Average Origin Bandwidth (MB/Sec)
     */
    const AVG_ORIGIN_BW                 = 'real:ankeena:avg_origin_bw';
    
    /**
     * (real) Current Bandwidth (MB/Sec)
     */
    const CURRENT_BW                    = 'real:ankeena:current_bw';
    
    /**
     * (real) Average Cache Bandwidth (MB/Sec)
     */
    const CURRENT_CACHE_BW              = 'real:ankeena:current_cache_bw';
    
    /**
     * (real) Current Disk Bandwidth (MB/Sec)
     */
    const CURRENT_DISK_BW               = 'real:ankeena:current_disk_bw';
    
    /**
     * (real) Current Origin Bandwidth (MB/Sec)
     */
    const CURRENT_ORIGIN_BW             = 'real:ankeena:current_origin_bw';
    
    /**
     * (real) Current Proxy Rate(MBytes/Sec)
     */
    const CURRENT_PROXY_RATE            = 'real:ankeena:current_proxy_rate';
    
    /**
     * (integer) Total Number of Active Connections
     */
    const TOTAL_ACTIVE_CONNS            = 'integer:ankeena:total_active_conns';
    
    /**
     * (integer) Total Number of HTTP Active Connections
     */
    const TOTAL_HTTP_ACTIVE_CONNS       = 'integer:ankeena:total_http_active_conns';
    
    /**
     * (integer) Total Number of RT-Stream Connections
     */
    const TOTAL_RTSTREAM_ACTIVE_CONNS   = 'integer:ankeena:total_rtstream_active_conns';
    
    /**
     * (integer) Total Number of Active Tunnel Connections
     */
    const TOTAL_TUNNEL_ACTIVE_CONNS     = 'integer:ankeena:total_tunnel_active_conns';
}

?>
