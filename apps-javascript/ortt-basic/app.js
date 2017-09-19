var handler = new OpenmixApplication({
    /**
     * The list of available CNAMEs, keyed by alias.
     */
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
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // The minimum availability score that providers must have in order to be considered available
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
            allReasons,
            decisionProvider,
            decisionReason,
            candidates = dataRtt,
            candidateAliases = Object.keys(candidates);

        allReasons = {
            best_performing_provider: 'A',
            data_problem: 'B',
            all_providers_eliminated: 'C'
        };

        /**
         * @param candidate
         * @param key
         */
        function filterAvailability(candidate, key) {
            return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
        }

        if (candidateAliases.length > 0 && Object.keys(dataAvail).length > 0) {
            // Remove unavailable providers
            candidates = filterObject(candidates, filterAvailability);
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length > 0) {
                decisionProvider = getLowest(candidates, 'http_rtt');
                decisionReason = allReasons.best_performing_provider;
            }
            else {
                decisionProvider = getHighest(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
        else {
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