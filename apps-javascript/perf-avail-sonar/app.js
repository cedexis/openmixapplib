var handler = new OpenmixApplication({
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
    default_provider: 'foo',
    default_ttl: 20,
    availability_threshold: 80
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

    /** @param {OpenmixConfiguration} config */
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
            candidates = dataRtt,
            candidateAliases;
        
        allReasons = {
            best_performing_provider: 'A',
            all_providers_eliminated: 'B',
            data_problem: 'C'
        };
        
        /**
        * @param candidate
        * @param key
        * @returns {boolean}
        */
        function filterAvailability(candidate, key) {
            // Filter sonar and radar availability
            return dataSonar[key] !== undefined
                && dataSonar[key].avail > 0
                && dataAvail[key] !== undefined
                && dataAvail[key].avail >= settings.availability_threshold;
        }
        
        // Check is there is not data problem
        if (Object.keys(candidates).length > 0
            && Object.keys(dataAvail).length > 0
            && Object.keys(dataSonar).length > 0) {
            // Select the best performing provider
            // availability score, if given
            
            // Remove any that don't meet the Sonar threshold and Radar sonar threshold
            candidates = filterObject(candidates, filterAvailability);
            candidateAliases = Object.keys(candidates);
            
            // If there is one or more available choose the best
            if (candidateAliases.length > 0) {
                decisionProvider = getLowest(candidates, 'http_rtt');
                decisionReason = allReasons.best_performing_provider;
            } else {
                // If none available choose more available
                decisionProvider = getHighest(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
        
        // Data problem, choose default provider
        if (decisionProvider === undefined) {
            decisionProvider = settings.default_provider;
            decisionReason = allReasons.data_problem;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
    };

    /**
     * @param object
     * @param filter
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
     * @param source
     * @param property
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
