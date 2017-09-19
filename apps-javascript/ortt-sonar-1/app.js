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
            dataSonar = parseSonarData(request.getData('sonar')),
            allReasons,
            decisionProvider,
            decisionReason = '',
            candidates = dataRtt;

        allReasons = {
            best_performing_provider: 'A',
            data_problem: 'B',
            all_providers_eliminated: 'C'
        };

        /**
         * @param candidate
         * @param key
         */
        function filterSonarSonar(candidate, key) {
            return dataSonar[key] !== undefined && dataSonar[key].avail > 0;
        }

        /**
         * @param candidate
         * @param key
         * @returns {boolean}
         */
        function filterAvailability(candidate, key) {
            return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
        }

        if (Object.keys(candidates).length > 0) {
            // Select the best performing provider that meets its minimum
            // availability score, if given
            if (Object.keys(dataSonar).length > 0) {
                // remove any sonar unavailable
                candidates = filterObject(candidates, filterSonarSonar);
            }
            if (Object.keys(candidates).length > 0 && Object.keys(dataAvail).length > 0) {
                candidates = filterObject(candidates, filterAvailability);
                if (Object.keys(candidates).length > 0) {
                    decisionProvider = getLowest(candidates,'http_rtt');
                    decisionReason = allReasons.best_performing_provider;
                } else {
                    decisionProvider = getHighest(dataAvail, 'avail');
                    decisionReason = allReasons.all_providers_eliminated;
                }
            }
        }
        if (decisionProvider === undefined) {
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
