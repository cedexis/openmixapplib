var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // keys are the Openmix aliases set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    // `padding` is a penalty (or bonus) to be applied as in percentage of the actual score, e.g. 10 = 10% slower (score * 1.1)
    // `countries` is a list of countries where the provider can be used
    // `markets` is a list of markets where the provider can be used
    // `asns` is a list of asns where the provider can be used
    providers: {
        'foo': {
            cname: 'www.foo.com',
            padding: 0,
            countries: ['CN']
        },
        'bar': {
            cname: 'www.bar.com',
            padding: 0,
            markets: ['NA', 'EU']
        },
        'baz': {
            cname: 'www.baz.com',
            padding: 0,
            asns: [123, 321]
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
    // A mapping of ASN codes to provider aliases:  asn_to_provider: { 123: 'baz', 124: 'bar' }
    asn_to_provider: {},
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
    // Set to `true` to enable the asn override feature
    asn_override: false,
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

    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length,
            alias;

        while (i --) {
            alias = aliases[i];

            config.requireProvider(alias);

            settings.providers[alias].padding = settings.providers[alias].padding || 0;
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = request.getProbe('avail'),
            dataRtt = request.getProbe('http_rtt'),
            candidates,
            candidateAliases,
            allReasons,
            decisionProvider = '',
            decisionReasons = [],
            decisionTtl,
            cnameOverride = '';

        allReasons = {
            optimum_server_chosen: 'A',
            no_available_servers: 'B',
            geo_override_on_country: 'C',
            geo_override_on_market: 'D',
            geo_override_not_available_country: 'E',
            geo_override_not_available_market: 'H',
            geo_default_on_country: 'F',
            geo_default_on_market: 'G',
            asn_override: 'H',
            asn_override_not_available: 'I'
        };

        /* jslint laxbreak:true */
        function filterCandidates(candidate, alias) {
            var provider = settings.providers[alias];
            // Considered only available providers in the provider countries/markets/asn
            return (candidate.avail !== undefined && candidate.avail >= settings.availability_threshold)
                && provider !== undefined
                && (provider.countries === undefined || provider.countries.indexOf(request.country) !== -1)
                && (provider.markets === undefined || provider.markets.indexOf(request.market) !== -1)
                && (provider.asns === undefined || provider.asns.indexOf(request.asn) !== -1);
        }

        function selectOverride(providers, locale, reason, error_reason) {
            if (providers[locale] !== undefined) {
                if (candidates[providers[locale]] !== undefined) {
                    decisionProvider = providers[locale];
                    decisionTtl = decisionTtl || settings.default_ttl;
                    decisionReasons.push(reason);
                } else {
                    decisionTtl = decisionTtl || settings.error_ttl;
                    decisionReasons.push(error_reason);
                }
            }
        }

        // First figure out the available platforms
        candidates = filterObject(dataAvail, filterCandidates);

        if (decisionProvider === '' && settings.geo_override) {
            selectOverride(settings.country_to_provider, request.country, allReasons.geo_override_on_country, allReasons.geo_override_not_available_country);

            if (decisionProvider === '') {
                selectOverride(settings.market_to_provider, request.market, allReasons.geo_override_on_market, allReasons.geo_override_not_available_market);
            }
        }

        if (decisionProvider === '' && settings.asn_override) {
            selectOverride(settings.asn_to_provider, request.asn, allReasons.asn_override, allReasons.asn_override_not_available);
        }

        if (decisionProvider === '') {
            // Join the rtt scores with the list of viable candidates
            candidates = intersectObjects(candidates, dataRtt, 'http_rtt');
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 1) {
                decisionProvider = candidateAliases[0];
                decisionReasons.push(allReasons.optimum_server_chosen);
                decisionTtl = decisionTtl || settings.default_ttl;
            }
            else if (candidateAliases.length !== 0) {
                // Apply padding to rtt scores
                addRttPadding(candidates);
                decisionProvider = getLowest(candidates, 'http_rtt');
                decisionReasons.push(allReasons.optimum_server_chosen);
                decisionTtl = decisionTtl || settings.default_ttl;
            }
            else if (settings.geo_default) {
                if (settings.country_to_provider[request.country] !== undefined) {
                    // Default based on request country
                    decisionProvider = settings.country_to_provider[request.country];
                    decisionTtl = decisionTtl || settings.error_ttl;
                    decisionReasons.push(allReasons.geo_default_on_country);
                }
                else if (settings.market_to_provider[request.market] !== undefined) {
                    // Default based on request market
                    decisionProvider = settings.market_to_provider[request.market];
                    decisionTtl = decisionTtl || settings.error_ttl;
                    decisionReasons.push(allReasons.geo_default_on_market);
                }
            }
        }

        if (decisionProvider === '') {
            decisionProvider = settings.default_provider;
            decisionTtl = decisionTtl || settings.error_ttl;
            decisionReasons.push(allReasons.no_available_servers);
        }

        if (settings.conditional_hostname !== undefined && settings.conditional_hostname[request.hostname_prefix] !== undefined) {
            // Confirm and translate the ISO country code to the numeric identifier
            // and format it as a prefix to the cname
            cnameOverride = settings.conditional_hostname[request.hostname_prefix] + '.';
        }

        response.respond(decisionProvider, cnameOverride + settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReasons.join(','));
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
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
     * @param {!Object} source
     * @param {string} property
     */
    function getLowest(source, property) {
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
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function intersectObjects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (source[key] !== undefined && source[key][property] !== undefined) {
                target[key][property] = source[key][property];
            }
            else {
                delete target[key];
            }
        }

        return target;
    }

    /**
     * @param {!Object.<string,{ http_rtt: number }>} data
     */
    function addRttPadding(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];
            data[key].http_rtt *= 1 + settings.providers[key].padding / 100;
        }
        return data;
    }
}
