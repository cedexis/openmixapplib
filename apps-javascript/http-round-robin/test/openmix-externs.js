
/**
 * @typedef {{requireProvider:function(string)}}
 */
var OpenmixConfiguration;

/**
 * @typedef {{
 *      market:string,
 *      country:string,
 *      asn:number,
 *      ip_address:string,
 *      hostname_prefix:string,
 *      getProbe:function(string):!Object.<string,{avail: number, http_rtt: number, http_kbps: number}>,
 *      getData:function(string):!Object.<string,string>
 *  }}
 */
var OpenmixRequest;

/**
 * @typedef {{
 *      addCName:function(string),
 *      addARecord:function(string),
 *      respond:function(number,string),
 *      setStatus:function(number),
 *      addProviderHost:function(string,string),
 *      setHeader: function(string, string),
 *      setProvider:function(string),
 *      setTTL:function(number),
 *      setReasonCode:function(string)
 * }}
 */
var OpenmixResponse;
