var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: {
        'foo': {
            cname: 'www.foo.com'
        },
        'bar': {
            cname: 'www.bar.com'
        },
        'baz': {
            cname: 'www.baz.com'
        }
    },
    // Selected if a provider can't be determined
    default_provider: 'foo',
    // A map of countries and availability threshold
    country_availability_thresholds: {
        US: 90,
        CN: 80
    },
    // If you want to restrict stickiness to certain countries, list their ISO 3166-1 alpha-2
    // codes in this array (see http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
    sticky_countries: [],
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 30,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20,
    availability_threshold: 60,
    // In KBPS: 500 kbps
    throughput_threshold: 500,
    /**
     * @type {number}
     */
    maxSavedProviders: 800
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
    var cache = this.cache = new LRUCache(settings.maxSavedProviders);
    var stickyAllCountries = settings.sticky_countries.length === 0;

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
            dataKbps = request.getProbe('http_kbps'),
            country = request.country,
            allReasons,
            decisionProvider,
            decisionReason,
            /** @type (Object.<string,{http_kbps:number,avail:number}>) */
            candidates,
            candidateAliases,
            cacheKey = request.market + "-" + request.country + "-" + request.asn,
            previousKbps,
            previousProvider;

        allReasons = {
            best_performing_provider_equal_previous: 'A',
            no_previous: 'B',
            previous_below_availability_threshold: 'C',
            new_provider_better: 'D',
            previous_better: 'E',
            all_providers_eliminated: 'F',
            sparse_kbps: 'G',
            previous_missing_kbps: 'H'
        };

        function filterCandidates(candidate) {
            // Specific threshold for specific countries
            if (country !== undefined && 
                settings.country_availability_thresholds[country] !== undefined) {
                return candidate.avail >= settings.country_availability_thresholds[country];    
            }
            return candidate.avail >= settings.availability_threshold;
        }

        // Get sticky provider from cache when appropriate
        if (stickyAllCountries || settings.sticky_countries.indexOf(request.country) !== -1) {
            previousProvider = cache.get(cacheKey);
        }

        dataAvail = filterObject(dataAvail, filterCandidates);

        // Join the kbps scores with the list of viable candidates
        candidates = joinObjects(dataKbps, dataAvail, 'avail');
        candidateAliases = Object.keys(candidates);

        if (candidateAliases.length !== 0) {

            if (candidates[previousProvider] !== undefined) {
                previousKbps = settings.throughput_threshold + candidates[previousProvider].http_kbps;
            }

            decisionProvider = getHighest(candidates, 'http_kbps');

            if (decisionProvider === previousProvider) {
                decisionReason = allReasons.best_performing_provider_equal_previous;
            }
            else if (previousProvider === undefined) {
                decisionReason = allReasons.no_previous;
            }
            else if (dataAvail[previousProvider] === undefined) {
                decisionReason = allReasons.previous_below_availability_threshold;
            }
            else if (previousKbps === undefined) {
                decisionReason = allReasons.previous_missing_kbps;
            }
            else if (candidates[decisionProvider].http_kbps > previousKbps) {
                decisionReason = allReasons.new_provider_better;
            }
            else {
                decisionReason = allReasons.previous_better;
                decisionProvider = previousProvider;
            }
        }
        else if (dataAvail[previousProvider] !== undefined) {
            decisionReason = allReasons.sparse_kbps;
            decisionProvider = previousProvider;
        }
        else if (Object.keys(dataAvail).length !== 0) {
            decisionReason = allReasons.sparse_kbps;
            decisionProvider = getHighest(dataAvail, 'avail');
        }
        else {
            decisionReason = allReasons.all_providers_eliminated;
            decisionProvider = settings.default_provider;
        }

        if (decisionProvider !== previousProvider) {
            cache.set(cacheKey, decisionProvider);
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
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
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function joinObjects(target, source, property) {
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
     * @param {!Object} source
     * @param {string} property
     */
    function getHighest(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;

        while (i --) {
            key = keys[i];
            value = source[key][property];
            if (value > max) {
                candidate = key;
                max = value;
            }
        }
        return candidate;
    }

    /** @constructor */
    function LRUCache(maxSize) {
        var index = [],
            values = {},
            lastIndex = 0;

        /**
         * @param {string} key
         * @param {string} value
         */
        this.set = function(key, value) {
            if (this.get(key) === undefined) {
                if (lastIndex < maxSize) {
                    lastIndex ++;
                }
                else {
                    delete values[index.splice(0, 1)[0]];
                }
            }

            index[lastIndex] = key;
            values[key] = value;
        };

        /**
         * @param {string} key
         */
        this.get = function(key) {
            var value = values[key];

            if (value !== undefined) {
                index.splice(index.indexOf(key), 1);
                index[lastIndex] = key;
            }

            return value;
        };
    }
}
