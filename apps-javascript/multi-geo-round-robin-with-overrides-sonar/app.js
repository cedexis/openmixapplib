var handler = new OpenmixApplication({
    // Add your differents providers here
    // All must be monitored by sonar
    // You must have a "origin" key in "providers" object in order to make the fallback effective
    providers: {
        'foo': {
            cname: 'www.foo.com'
        },
        'bar': {
            cname: 'www.bar.com'
        },
        'baz': {
            cname: 'www.baz.com'
        },
        'origin': {
            cname: 'www.origin.com'
        }
    },
    // A mapping of ISO 3166-1 country codes to a array of provider aliases
    // Provide a multi geolocalized roundrobin
    // country_to_provider_roundrobin: { 'UK': ['bar','foo'], 'ES': ['baz','faa']},
    country_to_provider_roundrobin: {
        'CN': ['bar','baz'],
        'JP': ['foo']
    },
    default_ttl: 20,
    // A mapping of ISO 3166-1 country codes to a array of provider aliases
    // Provide a multi geolocalized roundrobin
    // country_to_provider_roundrobin: { 'UK': ['bar','foo'], 'ES': ['baz','faa']},
    // flip to true if the platform will be considered unavailable if it does not have sonar data
    require_sonar_data: false
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

        // Initiate variables
        var allReasons,
            dataSonar = parseSonarData(request.getData('sonar')),
            decisionProvider,
            decisionReason,
            passedCandidates,
            passedCandidatesRRGeo;

        allReasons = {
            round_robin_geo: 'A',
            default_selected: 'B',
            passed_candidates_selected: 'C',
            no_passed_candidates_default_selected: 'D'
        };

        // determine which providers have a sonar value on or above threshold
        /**
         * @param alias
         * @returns {boolean}
         */
        function aboveSonarThreshold(alias) {
            if (dataSonar[alias] !== undefined && dataSonar[alias].avail !== undefined) {
                return dataSonar[alias].avail > 0;
            }
            return !settings.require_sonar_data;
        }

        // Providers which pass the Threshold test
        passedCandidates = filterObject(settings.providers, aboveSonarThreshold);
        passedCandidatesRRGeo = filterArray(settings.country_to_provider_roundrobin[request.country], aboveSonarThreshold);

        // First GEO Override
        /* jshint laxbreak:true */
        // Multi Geo Overriding Round Robin
        if(settings.country_to_provider_roundrobin !== undefined
            && settings.country_to_provider_roundrobin[request.country] !== undefined
            && passedCandidatesRRGeo !== undefined
            && passedCandidatesRRGeo.length > 0) {

            decisionProvider = passedCandidatesRRGeo[Math.floor(Math.random() * passedCandidatesRRGeo.length)];
            decisionReason = allReasons.round_robin_geo;
            // Else origin
        } else {
            // Check origin sonar decision
            if (dataSonar.origin !== undefined && dataSonar.origin.avail > 0) {
                decisionProvider = 'origin';
                decisionReason = allReasons.default_selected;
            } else {
                if (passedCandidates !== undefined && isEmpty(passedCandidates) === false) {
                    var passedCandidatesAliases = Object.keys(passedCandidates);
                    decisionProvider = passedCandidatesAliases[Math.floor(Math.random() * passedCandidatesAliases.length)];
                    decisionReason = allReasons.passed_candidates_selected;
                } else {
                    decisionProvider = 'origin';
                    decisionReason = allReasons.no_passed_candidates_default_selected;
                }
            }
        }
        /* jshint laxbreak:false */

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
    };

    /**
     * @param obj
     * @returns {boolean}
     */
    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            data = {};

        while (i --) {
            key = keys[i];

            if (filter(key)) {
                data[key] = (object[key]);
            }
        }
        return data;
    }

    /**
     * @param {!Array} array
     * @param {Function} filter
     */
    function filterArray(array, filter) {
        if (array === undefined) return [];

        var i = array.length,
            key,
            data = [];

        while (i --) {
            key = array[i];

            if (filter(key)) {
                data.push(key);
            }
        }
        return data;
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
