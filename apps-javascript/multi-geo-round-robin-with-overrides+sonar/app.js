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

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);
    var country_round_robin = typeof settings.country_to_provider_roundrobin === 'undefined' ? [] : Object.keys(settings.country_to_provider_roundrobin);
    this.lastAliasCountryIndex = {};
    this.lastFailOverAliasIndex = -1;
    var crrl = country_round_robin.length;
    while (crrl --) {
        this.lastAliasCountryIndex[String(country_round_robin[crrl])] = -1;
    }

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
            if (typeof dataSonar[alias] !== 'undefined') {
                return (dataSonar[alias] >= settings.sonar_threshold);
            }
            return !settings.require_sonar_data;
        }
        // test if an object is empty
        function isEmpty(obj) {
            return Object.keys(obj).length === 0;
        }

        // round robin selector function
        function selectProvider(aliases, reason, lastIndex) {
            if (lastIndex >= aliases.length) {
                lastIndex = -1;
            }
            decision_provider = aliases[++lastIndex];
            decision_reason = reason;
            decision_ttl = settings.default_ttl;
            return lastIndex;
        }


        // Providers which pass the Threshold test
        passedCandidates = filterObject(settings.providers, aboveSonarThreshold);
        passedCandidatesRRGeo = filterArray(settings.country_to_provider_roundrobin[request.country], aboveSonarThreshold);

        // First GEO Override
        /* jshint laxbreak:true */
        // Multi Geo Overriding Round Robin
        if(typeof settings.country_to_provider_roundrobin !== 'undefined'
            && typeof settings.country_to_provider_roundrobin[request.country] !== 'undefined'
            && typeof this.lastAliasCountryIndex[request.country] !== 'undefined'
            && typeof passedCandidatesRRGeo !== 'undefined'
            && passedCandidatesRRGeo.length > 0) {

            this.lastAliasCountryIndex[request.country] = selectProvider(passedCandidatesRRGeo, all_reasons.round_robin_geo, this.lastAliasCountryIndex[request.country]);
        // Else origin
        } else {
            // Check origin sonar decision
            if (typeof dataSonar.origin !== 'undefined' && dataSonar.origin >= settings.sonar_threshold) {
                decision_provider = 'origin';
                decision_ttl = decision_ttl || settings.default_ttl;
                decision_reason = all_reasons.default_selected;
            } else {
                if (typeof passedCandidates !== 'undefined' && isEmpty(passedCandidates) === false) {
                    this.lastFailOverAliasIndex = selectProvider(Object.keys(passedCandidates), all_reasons.passed_candidates_selected, this.lastFailOverAliasIndex);
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
        if (typeof array === 'undefined') return [];

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
