/*global
*/

var handler;

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i;
        for (i = 0; i < settings.providers.length; i += 1) {
            config.requireProvider(settings.providers[i].alias);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var avail,
            candidates,
            rtt,
            provider,
            reasons,
            current_reasons = [],
            override_ttl;

        function provider_from_alias(alias) {
            var i;
            for (i = 0; i < settings.providers.length; i += 1) {
                if (alias === settings.providers[i].alias) {
                    return settings.providers[i];
                }
            }
            return null;
        }

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

        function properties_array(container, fun) {
            var i, result = [];
            for (i in container) {
                if (container.hasOwnProperty(i)) {
                    if (fun.call(null, i)) {
                        result.push(i);
                    }
                }
            }
            return result;
        }

        function add_rtt_padding(data) {
            var i, provider;
            for (i in data) {
                if (data.hasOwnProperty(i)) {
                    //console.log(data[i]);
                    provider = provider_from_alias(i);
                    data[i] = data[i] * (1 + provider.padding / 100);
                }
            }
            return data;
        }

        function object_to_tuples_array(container) {
            var i, result = [];
            for (i in container) {
                if (container.hasOwnProperty(i)) {
                    result.push([i, container[i]]);
                }
            }
            return result;
        }

        reasons = {
            optimum_server_chosen: 'A',
            no_available_servers: 'B',
            geo_override_on_country: 'C',
            geo_override_on_market: 'D',
            geo_override_not_available_country: 'E',
            geo_override_not_available_market: 'H',
            geo_default_on_country: 'F',
            geo_default_on_market: 'G'
        };

        avail = flatten(request.getProbe('avail'), 'avail');
        //console.log('avail: ' + JSON.stringify(avail));

        // First figure out the available platforms
        candidates = properties_array(avail, function(i) {
            return (avail[i] && (settings.availability_threshold <= avail[i]));
        });
        //console.log('available candidates: ' + JSON.stringify(candidates));

        if (settings.geo_override) {
            if (settings.country_to_provider[request.country]) {
                if (-1 < candidates.indexOf(settings.country_to_provider[request.country])) {
                    // Override based on the request country
                    provider = provider_from_alias(settings.country_to_provider[request.country]);
                    response.respond(provider.alias, provider.cname);
                    response.setTTL(settings.default_ttl);
                    response.setReasonCode(reasons.geo_override_on_country);
                    return;
                }
                current_reasons.push(reasons.geo_override_not_available_country);
                override_ttl = settings.error_ttl;
            }

            if (settings.market_to_provider[request.market]) {
                if (-1 < candidates.indexOf(settings.market_to_provider[request.market])) {
                    // Override based on the request market
                    provider = provider_from_alias(settings.market_to_provider[request.market]);
                    response.respond(provider.alias, provider.cname);
                    response.setTTL(settings.default_ttl);
                    response.setReasonCode(reasons.geo_override_on_market);
                    return;
                }
                current_reasons.push(reasons.geo_override_not_available_market);
                override_ttl = settings.error_ttl;
            }
        }

        // Get the RTT scores, transformed and filtered for use
        rtt = flatten(request.getProbe('http_rtt'), 'http_rtt');
        rtt = add_rtt_padding(rtt);
        rtt = object_to_tuples_array(rtt);
        rtt = rtt.filter(function(tuple) {
            return -1 < candidates.indexOf(tuple[0]);
        });
        rtt.sort(function(left, right) {
            if (left[1] < right[1]) {
                return -1;
            }
            if (left[1] > right[1]) {
                return 1;
            }
            return 0;
        });
        //console.log('rtt: ' + JSON.stringify(rtt));

        if (0 < rtt.length) {
            provider = provider_from_alias(rtt[0][0]);
            response.respond(provider.alias, provider.cname);
            response.setTTL(override_ttl || settings.default_ttl);
            current_reasons.push(reasons.optimum_server_chosen);
            response.setReasonCode(current_reasons.join(''));
            return;
        }

        if (settings.geo_default) {
            if (settings.country_to_provider[request.country]) {
                // Default based on the request country
                provider = provider_from_alias(settings.country_to_provider[request.country]);
                response.respond(provider.alias, provider.cname);
                response.setTTL(settings.error_ttl);
                current_reasons.push(reasons.geo_default_on_country);
                response.setReasonCode(current_reasons.join(''));
                return;
            }

            if (settings.market_to_provider[request.market]) {
                // Default based on the request market
                provider = provider_from_alias(settings.market_to_provider[request.market]);
                response.respond(provider.alias, provider.cname);
                response.setTTL(settings.error_ttl);
                current_reasons.push(reasons.geo_default_on_market);
                response.setReasonCode(current_reasons.join(''));
                return;
            }
        }

        // If we get here, select the default provider
        provider = provider_from_alias(settings.default_provider);
        response.respond(provider.alias, provider.cname);
        response.setTTL(settings.error_ttl);
        current_reasons.push(reasons.no_available_servers);
        response.setReasonCode(current_reasons.join(''));
    };
}

handler = new OpenmixApplication({
    // provider padding is in percent, e.g. 10 = 10% slower (score * 1.1)
    providers: [
        {
            alias: 'foo',
            cname: 'www.foo.com',
            padding: 0
        },
        {
            alias: 'bar',
            cname: 'www.bar.com',
            padding: -70
        },
        {
            alias: 'baz',
            cname: 'www.baz.com',
            padding: 0
        },
        {
            alias: 'qux',
            cname: 'www.qux.com',
            padding: 0
        }
    ],
    availability_threshold: 90,
    country_to_provider: {},
    market_to_provider: {},
    geo_override: false,
    geo_default: false,
    default_provider: 'foo',
    default_ttl: 20,
    error_ttl: 20
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}
