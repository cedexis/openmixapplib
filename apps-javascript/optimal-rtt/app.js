var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // keys are the Openmix aliases set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    // `padding` is a penalty (or bonus) to be applied as in percentage of the actual score, e.g. 10 = 10% slower (score * 1.1)
    providers: {
        'foo': {
            cname: 'www.foo.com',
            padding: 0
        },
        'bar': {
            cname: 'www.bar.com',
            padding: 0
        },
        'baz': {
            cname: 'www.baz.com',
            padding: 0
        },
        'qux': {
            cname: 'www.qux.com',
            padding: 0
        }
    },
    // The minimum availability score that providers must have in order to be considered available
    availability_threshold: 90,
    // A mapping of ISO 3166-1 country codes to provider aliases
    country_to_provider: {},
    // A mapping of market codes to provider aliases
    market_to_provider: {},
    // A mapping of ISO 3166-1 country to identifier (hostname prefix)
    /**
     * Some platforms use virtual-host specific hostnames, often for content
     * localization, but you often want to centralize these into your Openmix
     * script rather than creating many Openmix platforms. For example, imagine
     * your website has the URLs http://<country>.example.com, where <country>
     * is replaced with ISO codes.
     *
     * The solution is to dynamically construct the resulting hostname in the
     * application as in this example, which routes traffic to the available
     * platform with the lowest response time.
     *
     * Example configuration:
     *
     * conditional_hostname: {
     *     'DE': '123',
     *     'UK': '456',
     *     'ES': '789'
     * },
     */
    conditional_hostname: {},
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

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length,
            keys,
            j;

        while (i --) {
            config.requireProvider(aliases[i]);

            if (typeof settings.providers[aliases[i]].countries !== 'undefined') {
                settings.providers[aliases[i]].countries = array_to_keys(settings.providers[aliases[i]].countries);
            }
            if (typeof settings.providers[aliases[i]].markets !== 'undefined') {
                settings.providers[aliases[i]].markets = array_to_keys(settings.providers[aliases[i]].markets);
            }
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var avail = request.getProbe('avail'),
            candidates,
            candidate_aliases,
            all_reasons,
            decision_provider,
            decision_reasons = [],
            decision_ttl,
            override_cname = '';

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

        function filter_candidates(candidate, alias) {
            var provider = settings.providers[alias];
            // Considered only in the provider countries
            if (typeof provider.countries !== 'undefined' && typeof provider.countries[request.country] === 'undefined') {
                return false;
            }
            // Considered only in the provider markets
            if (typeof provider.markets !== 'undefined' && typeof provider.markets[request.market] === 'undefined') {
                return false;
            }
            return candidate.avail >= settings.availability_threshold;
        }

        // First figure out the available platforms
        candidates = filter_object(avail, filter_candidates);
        //console.log('available candidates: ' + JSON.stringify(candidates));

        if (settings.geo_override) {
            if (settings.country_to_provider[request.country]) {
                if (typeof candidates[settings.country_to_provider[request.country]] !== 'undefined') {
                    // Override based on the request country
                    decision_provider = settings.country_to_provider[request.country];
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reasons.push(all_reasons.geo_override_on_country);
                } else {
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_override_not_available_country);
                }
            }

            if (!decision_provider && typeof settings.market_to_provider[request.market] !== 'undefined') {
                if (typeof candidates[settings.market_to_provider[request.market]] !== 'undefined') {
                    // Override based on the request market
                    decision_provider = settings.market_to_provider[request.market];
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reasons.push(all_reasons.geo_override_on_market);
                } else {
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_override_not_available_market);
                }
            }
        }

        if (!decision_provider) {
            // Join the rtt scores with the list of viable candidates
            candidates = join_objects(candidates, request.getProbe('http_rtt'), 'http_rtt');
            candidate_aliases = Object.keys(candidates);

            if (candidate_aliases.length === 1) {
                decision_provider = candidate_aliases[0];
                decision_reasons.push(all_reasons.optimum_server_chosen);
                decision_ttl = decision_ttl || settings.default_ttl;
            }
            else if (candidate_aliases.length !== 0) {
                // Apply padding to rtt scores
                add_rtt_padding(candidates);
                decision_provider = get_lowest(candidates, 'http_rtt');
                decision_reasons.push(all_reasons.optimum_server_chosen);
                decision_ttl = decision_ttl || settings.default_ttl;
            }
            else if (settings.geo_default) {
                if (typeof settings.country_to_provider[request.country] !== 'undefined') {
                    // Default based on request country
                    decision_provider = settings.country_to_provider[request.country];
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_default_on_country);
                }
                else if (typeof settings.market_to_provider[request.market] !== 'undefined') {
                    // Default based on request market
                    decision_provider = settings.market_to_provider[request.market];
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(all_reasons.geo_default_on_market);
                }
            }
        }

        if (!decision_provider) {
            decision_provider = settings.default_provider;
            decision_ttl = decision_ttl || settings.error_ttl;
            decision_reasons.push(all_reasons.no_available_servers);
        }

        if (typeof settings.conditional_hostname !== 'undefined' && typeof settings.conditional_hostname[request.hostname_prefix] !== 'undefined') {
            // Confirm and translate the ISO country code to the numeric identifier
            // and format it as a prefix to the cname
            override_cname = settings.conditional_hostname[request.hostname_prefix] + '.';
        }

        response.respond(decision_provider, override_cname + settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };

    /**
     * @param {Object} object
     * @param {Function} filter
     */
    function filter_object(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (!filter(object[key], key)) {
                delete object[key];
            }
        }

        return object;
    }

    /**
     * @param {Object} source
     * @param {string} property
     */
    function get_lowest(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            min = Infinity,
            value;

        while (i --) {
            key = keys[i];
            value = source[key][property];

            if (value < min) {
                candidate = key;
                min = value;
            }
        }

        return candidate;
    }

    /**
     * @param {Object} target
     * @param {Object} source
     * @param {string} property
     */
    function join_objects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (typeof source[key] !== 'undefined' && typeof source[key][property] !== 'undefined') {
                target[key][property] = source[key][property];
            }
            else {
                delete target[key];
            }
        }

        return target;
    }

    /**
     * @param {Object} data
     */
    function add_rtt_padding(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];
            data[key].http_rtt *= 1 + settings.providers[key].padding / 100;
        }
        return data;
    }

    /**
     * @param {Array} array
     */
    function array_to_keys(array) {
        var object = {},
            i = array.length;

        while (i --) {
            object[array[i]] = true;
        }

        return object;
    }
}