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

    default_ttl: 20,

    // A mapping of ISO 3166-1 country codes to a array of provider aliases
    // Provide a multi geolocalized roundrobin
    // country_to_provider_roundrobin: { 'UK': ['bar','foo'], 'ES': ['baz','faa']},
    country_to_provider_roundrobin: {
            'CN': ['bar','baz'],
            'JP': ['foo']
            },

    // sonar values are between 0 - 1
    sonar_threshold: 0.8,

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
        var dataSonar  = parseSonarData( request.getData('sonar') ),
            all_reasons,
            decision_provider,
            decision_reason,
            passedCandidates,
            passedCandidatesRRGeo,
            decision_ttl;

        all_reasons = {
            round_robin_geo: 'A',
            default_selected: 'B',
            passed_candidates_selected: 'C',
            no_passed_candidates_default_selected: 'D'

        };

        // Declaring useful functions

        // determine which providers have a sonar value above threshold
        function aboveSonarThreshold(alias) {
            if (dataSonar[alias] !== undefined) {
                return (dataSonar[alias] >= settings.sonar_threshold);
            }
            return !settings.require_sonar_data;
        }
        // test if an object is empty
        function isEmpty(obj) {
            return Object.keys(obj).length === 0;
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

            decision_provider = passedCandidatesRRGeo[Math.floor(Math.random() * passedCandidatesRRGeo.length)];
            decision_reason = all_reasons.round_robin_geo;
            decision_ttl = settings.default_ttl;
        // Else origin
        } else {
            // Check origin sonar decision
            if (dataSonar.origin !== undefined && dataSonar.origin >= settings.sonar_threshold) {
                decision_provider = 'origin';
                decision_ttl = decision_ttl || settings.default_ttl;
                decision_reason = all_reasons.default_selected;
            } else {
                if (passedCandidates !== undefined && isEmpty(passedCandidates) === false) {
                    var passedCandidatesAliases = Object.keys(passedCandidates);
                    decision_provider = passedCandidatesAliases[Math.floor(Math.random() * passedCandidatesAliases.length)];
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reason = all_reasons.passed_candidates_selected;
                } else {
                    decision_provider = 'origin';
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reason = all_reasons.no_passed_candidates_default_selected; 
                }
            }
        }
        /* jshint laxbreak:false */


        response.respond(decision_provider, settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reason); 
    };

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
