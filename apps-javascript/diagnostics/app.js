/*jslint
    sub:true
*/

var handler;

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    /** @param {OpenmixConfiguration} config */
    this.do_init = function(config) {
        var i;
        for (i = 0; i < settings.providers.length; i += 1) {
            config.requireProvider(settings.providers[i]);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {

        var data = {},
            override_cname = [];

        function flatten(obj, property) {
            var result = {}, i;
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (obj[i].hasOwnProperty(property) && obj[i][property]) {
                        result[i] = obj[i][property];
                    }
                }
            }
            return result;
        }

        function get_diag_string(data) {
            var i, result = [];
            for (i in data) {
                if (data.hasOwnProperty(i)) {
                    //result.push(i);
                    result.push(data[i]);
                }
            }
            return result.join('-');
        }

        data.avail = flatten(request.getProbe('avail'), 'avail');
        data.rtt = flatten(request.getProbe('http_rtt'), 'http_rtt');
        // console.log('avail: ' + JSON.stringify(data.avail));
        // console.log('rtt: ' + JSON.stringify(data.rtt));

        override_cname.push((request.market + '-' + request.country + '-' + request.asn).toLowerCase());
        override_cname.push('avail-len-' + Object.keys(data.avail).length);
        override_cname.push(get_diag_string(data.avail));
        override_cname.push('rtt-len-' + Object.keys(data.rtt).length);
        override_cname.push(get_diag_string(data.rtt));
        override_cname.push('example.com');

        response.addCName(override_cname.join('.').replace(/_/g, '-'));
        response.setTTL(settings.default_ttl);
    };

}

handler = new OpenmixApplication({
    // The list of provider aliases that you want diagnosed
    providers: [ 'bitgravity', 'edgecast', 'level3', 'onapp' ],
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
