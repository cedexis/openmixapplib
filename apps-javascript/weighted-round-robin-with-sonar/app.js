/**
 * Select randomly from a set of weighted providers while taking Sonar scores
 * into account.
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

    // The DNS TTL to be applied to DNS responses in seconds.
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
        var dataSonar = parseSonarData(request.getData('sonar')),
            allReasons,
            decisionProvider,
            candidates,
            candidateAliases,
            decisionReason = '',
            totalWeight = 0;

        allReasons = {
            routed_randomly_by_weight: 'A',
            only_one_platform_available: 'B',
            choose_random_platform: 'C'
        };

        /**
         * @param candidate
         * @param key
         */
        function filterSonarAvailability(candidate, key) {
            return dataSonar[key] !== undefined && dataSonar[key].avail > 0;
        }

        /**
         * @param candidates
         */
        function getTotalWeight(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                total = 0,
                weight;
            while (i --) {
                weight = settings.providers[keys[i]].weight;

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

        if (Object.keys(dataSonar).length > 0) {
            // filter candidates by Sonar threshold,
            candidates = filterObject(dataSonar, filterSonarAvailability);
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length > 0) {
                if (candidateAliases.length === 1) {
                    decisionProvider = candidateAliases[0];
                    decisionReason = allReasons.only_one_platform_available;
                }
                else {
                    // Respond with a weighted random selection
                    totalWeight = getTotalWeight(candidates);
                    if (totalWeight > 0) {
                        decisionProvider = getWeightedRandom(candidates, totalWeight);
                        decisionReason = allReasons.routed_randomly_by_weight;
                    }
                }
            }
        }

        if (decisionProvider === undefined) {
            // If we get here, something went wrong. Select randomly to avoid fallback.
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason = allReasons.choose_random_platform;
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
     * @param {!Object} data
     */
    function parseSonarData(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];
            try {
                data[key] = JSON.parse(data[key]);
            }
            catch (e) {
                delete data[key];
            }
        }
        return data;
    }
}