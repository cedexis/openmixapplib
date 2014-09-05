
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
            all_reasons,
            decision_provider,
            decision_reasons = [],
            decision_ttl;

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

        all_reasons = {
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
                    decision_provider = provider_from_alias(settings.country_to_provider[request.country]);
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reasons.push(all_reasons.geo_override_on_country);
                } else {
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_override_not_available_country);
                }
            }

            if (!decision_provider) {
                if (settings.market_to_provider[request.market]) {
                    if (-1 < candidates.indexOf(settings.market_to_provider[request.market])) {
                        // Override based on the request market
                        decision_provider = provider_from_alias(settings.market_to_provider[request.market]);
                        decision_ttl = decision_ttl || settings.default_ttl;
                        decision_reasons.push(all_reasons.geo_override_on_market);
                    } else {
                        decision_ttl = decision_ttl || settings.error_ttl;
                        decision_reasons.push(all_reasons.geo_override_not_available_market);
                    }
                }
            }
        }

        if (!decision_provider) {
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
                decision_provider = provider_from_alias(rtt[0][0]);
                decision_reasons.push(all_reasons.optimum_server_chosen);
                decision_ttl = decision_ttl || settings.default_ttl;
            } else if (settings.geo_default) {
                if (settings.country_to_provider[request.country]) {
                    // Default based on the request country
                    decision_provider = provider_from_alias(settings.country_to_provider[request.country]);
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_default_on_country);
                } else if (settings.market_to_provider[request.market]) {
                    // Default based on the request market
                    decision_provider = provider_from_alias(settings.market_to_provider[request.market]);
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_default_on_market);
                }
            }
        }

        if (!decision_provider) {
            decision_provider = provider_from_alias(settings.default_provider);
            decision_ttl = decision_ttl || settings.error_ttl;
            decision_reasons.push(all_reasons.no_available_servers);
        }

        response.respond(decision_provider.alias, decision_provider.cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };
}

handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    // `padding` is a penalty (or bones) to be applied as in percentage of the actual score, e.g. 10 = 10% slower (score * 1.1)
    providers: [
        {
            alias: 'foo',
            cname: 'www.foo.com',
            padding: 0
        },
        {
            alias: 'bar',
            cname: 'www.bar.com',
            padding: 0
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
    // The minimum availability score that providers must have in order to be considered available
    availability_threshold: 90,
    // A mapping of ISO 3166-1 country codes to provider aliases
    country_to_provider: {},
    // A mapping of market codes to provider aliases
    market_to_provider: {},
    // Set to `true` to enable the geo override feature
    geo_override: false,
    // Set to `true` to enable the geo default feature
    geo_default: false,
    // Selected if an optimal provider can't be determined
    default_provider: 'foo',
    // The TTL to be set when the application chooses an optimal provider, including geo override.
    default_ttl: 20,
    // The TTL to be set when the application chooses a potentially non-optimal provider, e.g. default or geo default.
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
