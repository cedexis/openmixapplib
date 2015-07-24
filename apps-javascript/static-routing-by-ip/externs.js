
/** @constructor */
function Configuration() {}

/**
 * @param {string} alias
 */
Configuration.prototype.requireProvider = function(alias) {};

/** @constructor */
function OpenmixRequest() {
    /** @type {string} */
    this.region = 'Change me!';

    /** @type {number} */
    this.asn = 1234;

    /** @type {string} */
    this.worker_id = 'Change me!';

    /** @type {string} */
    this.ip_address = 'Change me!';

    /** @type {string} */
    this.resolver_ip_address = 'Change me!';
}

/**
 * @param {string} name
 * @return {{ fusion_radar_feed: string }}
 */
OpenmixRequest.prototype.getData = function(name) {};

/**
 * @param {string} name
 * @return { Object.<string, { avail: number }> }
 */
OpenmixRequest.prototype.getProbe = function(name) {};

/** @constructor */
function OpenmixResponse() {}

/**
 * @param {string} alias
 * @param {string} cname
 */
OpenmixResponse.prototype.respond = function(alias, cname) {};

/**
 * @param {string} reason
 */
OpenmixResponse.prototype.setReasonCode = function(reason) {};

/**
 * @param {number} ttl
 */
OpenmixResponse.prototype.setTTL = function(ttl) {};

/**
 * @constructor
 *
 * @param {string} net
 * @param {number=} mask
 */
function Netmask(net, mask) {}
