/**
 * Select randomly from a set of weighted providers
 */
var handler = new OpenmixApplication({
    // The array of all possible responses. The key, e.g. 'provider1', is the
    // label for the platform. The value, e.g. 'cname1.foo.com' is the CNAME
    // to hand back when that platform is selected.

    // Round Robin weight (these are relative to one another for purposes of
    // weighted random selection, but it may be useful to think of them as
    // percentages (i.e. they add up to 100).
    providers: {
        'provider1': {
            cname: 'cname1.foo.com',
            weight: 50
        },
        'provider2': {
            cname: 'cname2.foo.com',
            weight: 30
        },
        'provider3': {
            cname: 'cname3.foo.com',
            weight: 20
        }
    },

    //list of countries where you want to do RR e.g. ['CN','US','FR','ES']
    countries_rr: ['CN'],
    // The DNS TTL to be applied to DNS responses in seconds.
    default_ttl: 20,
    availability_threshold: 90
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

        // Register the providers that will be selected from
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
            country = request.country,
            allReasons,
            decisionProvider,
            candidates = settings.providers,
            candidatesAliases = Object.keys(candidates),
            decisionReason = '',
            totalWeight = 0;

        allReasons = {
            routed_randomly_by_weight: 'A',
            only_one_provider_avail: 'B',
            best_performing_provider: 'C',
            all_providers_eliminated: 'D',
            data_problem: 'E'
        };

        /**
         * @param candidate
         * @param key
         * @returns {boolean}
         */
        function filterAvailability(candidate, key) {
            return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
        }

        /**
         * @param candidates
         */
        function getTotalWeight(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                key,
                total = 0,
                weight;

            while (i --) {
                key = keys[i];
                weight = settings.providers[key].weight;

                if (weight !== undefined) {
                  total += weight;
                }
            }

            return total;
        }

        /**
         * @param candidates
         * @param max
         */
        function getWeightedRandom(candidates, max) {
            var random = Math.floor(Math.random() * max),
                mark = 0,
                keys = Object.keys(candidates),
                i = keys.length,
                key, weight;

            while (i --) {
                key = keys[i];
                weight  = settings.providers[key].weight;

                if (weight !== undefined) {
                    mark += weight;
                    if (random < mark) {
                        return key;
                    }
                }
            }
        }

        if (candidatesAliases.length > 0 && Object.keys(dataAvail).length > 0) {
            //filter the candidates by availability
            candidates = filterObject(candidates, filterAvailability);
            candidatesAliases = Object.keys(candidates);
            if (candidatesAliases.length > 0) {
                if (candidatesAliases.length === 1) {
                    decisionProvider = candidatesAliases[0];
                    decisionReason = allReasons.only_one_provider_avail;
                } else {
                    if (settings.countries_rr.indexOf(country) !== -1) {
                        //do weighted RR
                        // Respond with a weighted random selection
                        totalWeight = getTotalWeight(candidates);
                        if (totalWeight > 0) {
                            decisionProvider = getWeightedRandom(candidates, totalWeight);
                            decisionReason = allReasons.routed_randomly_by_weight;
                        }
                    }
                    else if (Object.keys(dataRtt).length > 0) {
                        //do ORTT
                        candidates = intersectObjects(candidates, dataRtt, 'http_rtt');
                        candidatesAliases = Object.keys(candidates);

                        if (candidatesAliases.length > 0) {
                            decisionProvider = getLowest(candidates, 'http_rtt');
                            decisionReason = allReasons.best_performing_provider;
                        }

                    }
                }
            }
            if (decisionProvider === undefined) {
                decisionProvider = getHighest(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
        if (decisionProvider === undefined) {
            // If we get here, something went wrong. Select randomly to avoid fallback.
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason = allReasons.data_problem;
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
            key,
            candidates = {};

        while (i --) {
            key = keys[i];

            if (filter(object[key], key)) {
                candidates[key] = object[key];
            }
        }

        return candidates;
    }

    /**
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function intersectObjects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key,
            candidates = {};

        while (i --) {
            key = keys[i];

            if (source[key] !== undefined && source[key][property] !== undefined) {
                candidates[key] = target[key];
                candidates[key][property] = source[key][property];
            }
        }

        return candidates;
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

}
