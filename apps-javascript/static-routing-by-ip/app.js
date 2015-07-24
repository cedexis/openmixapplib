var productionConfig = {
    providers: {
        'provider-a': {
            'cname': 'a.foo.com'
        },
        'provider-b': {
            'cname': 'b.foo.com'
        },
        'provider-c': {
            'cname': 'c.foo.com'
        },
        'provider-d': {
            'cname': 'd.foo.com'
        }
    },
    // Each address block listed here will be used to route requests to a
    // specific provider.  Addresses not falling into any of these blocks will
    // be routed to the default provider.
    // These are evaluated from top to bottom, so more specific blocks should
    // come before larger or overlapping blocks.
    addressBlocks: [
        [ '216.240.32.100/32', 'provider-d' ],
        [ '216.240.32.0/24', 'provider-b' ],
        [ '216.240.33.0/25', 'provider-a' ],
        [ '216.240.33.128/25', 'provider-c' ]
    ],
    defaultProvider: 'provider-a',
    responseTTL: 20
};

var handler = new OpenmixApplication(productionConfig);

/**
 * @param {!Configuration} config
 */
function init(config) {
    'use strict';
    handler.doInit(config);
}

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
function onRequest(request, response) {
    'use strict';
    handler.handleRequest(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    /** @type {!Object.<string, Object.<string, string>>} */
    this.providers = settings.providers;

    /** @type {!Array} */
    this.addressBlocks = settings.addressBlocks;

    /** @type {string} */
    this.defaultProvider = settings.defaultProvider;

    /** @type {number} */
    this.responseTTL = settings.responseTTL;
}

/**
 * @param {!Configuration} config
 */
OpenmixApplication.prototype.doInit = function(config) {
    for (var i in this.providers) {
        if (this.providers.hasOwnProperty(i)) {
            config.requireProvider(i);
        }
    }
    this.parseAddressBlocks();
};

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
OpenmixApplication.prototype.handleRequest = function(request, response) {
    //debugger;
    var alias = this.defaultProvider;
    var reason = 'default';
    var l = this.addressBlocks.length;
    for (var i = 0; i < l; i++) {
        var currentBlock = this.addressBlocks[i];
        if (currentBlock[2].contains(request.ip_address)) {
            alias = currentBlock[1];
            reason = 'mapped';
            break;
        }
    }
    response.respond(alias, this.providers[alias].cname);
    response.setTTL(this.responseTTL);
    response.setReasonCode(reason);
};

OpenmixApplication.prototype.parseAddressBlocks = function() {
    for (var i = 0; i < this.addressBlocks.length; i++) {
        var temp = this.addressBlocks[i];
        temp.push(new Netmask(temp[0]));
    }
};
