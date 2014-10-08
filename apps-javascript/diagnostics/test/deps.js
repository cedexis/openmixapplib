
/** @constructor */
function OpenmixConfiguration() {}

/** @param {string} alias */
OpenmixConfiguration.prototype.requireProvider = function(alias) {};

/** @constructor */
function OpenmixRequest() {
    /** @type {string} */
    this.market = 'some market';
    /** @type {string} */
    this.country = 'some country';
    /** @type {number} */
    this.asn = 1234;
}

/** @param {string} probe_type */
OpenmixRequest.prototype.getProbe = function(probe_type) {};

/** @param {string} feed_name */
OpenmixRequest.prototype.getData = function(feed_name) {};

/** @constructor */
function OpenmixResponse() {}

/** @param {string} value */
OpenmixResponse.prototype.addCName = function(value) {};

/**
 * @param {string} alias
 * @param {string} cname
 */
OpenmixResponse.prototype.respond = function(alias, cname) {};

/** @param {number} value */
OpenmixResponse.prototype.setTTL = function(value) {};

/** @param {string} value */
OpenmixResponse.prototype.setReasonCode = function(value) {};
