var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: {
        'foo': {
            cname: 'www.foo.com',
            padding:0
        },
        'bar': {
            cname: 'www.bar.com',
            padding:10
        },
        'baz': {
            cname: 'www.baz.com',
            padding:0
        }
    },
    // Selected if a provider can't be determined
    default_provider: 'foo',

    // If you want to restrict stickiness to certain countries, list their ISO 3166-1 alpha-2
    // codes in this array (see http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
    sticky_countries: [],
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 30,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20,
    availability_threshold: 60,
    variance_threshold: 0.65,

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

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);
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
            dataRtt = request.getProbe('http_rtt'),
            allReasons,
            decisionProvider,
            decisionReason,
            /** @type (Object.<string,{http_rtt:number,avail:number}>) */
            candidates,
            candidateAliases,
            cacheKey = request.market + "-" + request.country + "-" + request.asn,
            previousRtt,
            previousProvider;

        allReasons = {
            best_performing_provider_equal_previous: 'A',
            no_previous: 'B',
            previous_below_availability_threshold: 'C',
            new_provider_below_varianceThreshold: 'D',
            previous_best_perform_within_varianceThreshold: 'E',
            all_providers_eliminated: 'F',
            sparse_rtt: 'G',
            previous_missing_rtt: 'H',
            sparse_data: 'I'
        };

        function filterCandidates(candidate) {
            return candidate.avail >= settings.availability_threshold;
        }

        // Get sticky provider from cache when appropriate
        if (stickyAllCountries || settings.sticky_countries.indexOf(request.country) !== -1) {
            previousProvider = cache.get(cacheKey);
        }

        dataAvail = filterObject(dataAvail, filterCandidates);

        // Join the rtt scores with the list of viable candidates
        candidates = joinObjects(dataRtt, dataAvail, 'avail');
        candidateAliases = Object.keys(candidates);

        if (candidateAliases.length !== 0) {
            addRttPadding(candidates);

            if (typeof candidates[previousProvider] !== 'undefined') {
                previousRtt = settings.variance_threshold * candidates[previousProvider].http_rtt;
            }

            decisionProvider = getLowest(candidates, 'http_rtt');

            if (decisionProvider === previousProvider) {
                decisionReason = allReasons.best_performing_provider_equal_previous;
            }
            else if (typeof previousProvider === 'undefined') {
                decisionReason = allReasons.no_previous;
            }
            else if (typeof dataAvail[previousProvider] === 'undefined') {
                decisionReason = allReasons.previous_below_availability_threshold;
            }
            else if (typeof previousRtt === 'undefined') {
                decisionReason = allReasons.previous_missing_rtt;
            }
            else if (candidates[decisionProvider].http_rtt < previousRtt) {
                decisionReason = allReasons.new_provider_below_varianceThreshold;
            }
            else {
                decisionReason = allReasons.previous_best_perform_within_varianceThreshold;
                decisionProvider = previousProvider;
            }
        }
        else if (typeof dataAvail[previousProvider] !== 'undefined') {
            decisionReason = allReasons.sparse_rtt;
            decisionProvider = previousProvider;
        }
        else if (Object.keys(dataAvail).length !== 0) {
            decisionReason = allReasons.sparse_rtt;
            decisionProvider = getHighest(dataAvail);
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
     * @param {!Object} source
     */
    function getHighest(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;

        while (i --) {
            key = keys[i];
            value = source[key].avail;

            if (value > max) {
                candidate = key;
                max = value;
            }
        }

        return candidate;
    }

    /**
     * @param {!Object} data
     */
    function addRttPadding(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];
            data[key].http_rtt += settings.providers[key].padding;
        }
        return data;
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
            if (typeof this.get(key) === 'undefined') {
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

            if (typeof value !== 'undefined') {
                index.splice(index.indexOf(key), 1);
                index[lastIndex] = key;
            }

            return value;
        };
    }
}
