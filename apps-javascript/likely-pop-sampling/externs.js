/**
 * @typedef {{
 *   country: string,
 *   market: string,
 *   getData: function(string),
 *   getProbe: function(string)
 * }}
 */
var OpenmixRequest;

/**
 * @typedef {{
 *   respond: function(string,string),
 *   setTTL: function(number),
 *   setReasonCode: function(string)
 * }}
 */
var OpenmixResponse;

/**
 * @typedef {{
 *   requireProvider: function(string)
 * }}
 */
var OpenmixConfig;
