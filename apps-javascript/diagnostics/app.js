var handler = new OpenmixApplication({
    providers: {
        'bitgravity': {
            cname: 'cname1.com'
        },
        'edgecast': {
            cname: 'cname2.com'
        },
        'level3': {
            cname: 'cname3.com'
        },
        'onapp': {
            cname: 'cname4.com'
        }
    },
    default_ttl: 20
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';
    
    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = request.getProbe('avail'),
            dataRtt = request.getProbe('http_rtt'),
            cnameOverride = [];

        function getDiagString(data, property) {
            var keys = Object.keys(data),
                i = keys.length,
                result = [],
                key;
            while (i --) {
                key = keys[i];
                result.push(data[key][property]);
            }
            return result.join('-');
        }

        cnameOverride.push((request.market + '-' + request.country + '-' + request.asn).toLowerCase());
        cnameOverride.push('avail-len-' + Object.keys(dataAvail).length);
        cnameOverride.push(getDiagString(dataAvail, 'avail'));
        cnameOverride.push('rtt-len-' + Object.keys(dataRtt).length);
        cnameOverride.push(getDiagString(dataRtt, 'http_rtt'));
        cnameOverride.push('example.com');

        response.addCName(cnameOverride.join('.').replace(/_/g, '-'));
        response.setTTL(settings.default_ttl);
    };

}