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
        }
    },
    failover_providers: {
        'foo_f': {
            cname: 'www.foo_f.com'
        },
        'bar_f': {
            cname: 'www.bar_f.com'
        },
        'baz_f': {
            cname: 'www.baz_f.com'
        }
    },
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // Set Fusion Sonar threshold for availability for the platform to be included.
    // sonar values are between 0 - 5
    fusion_sonar_threshold: 2
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
    var failoverAliases = settings.failover_providers === undefined ? [] : Object.keys(settings.failover_providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length,
            j = failoverAliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }
        while (j --) {
            config.requireProvider(failoverAliases[j]);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var allReasons,
            /** @type { !Object.<string, { health_score: { value:string }, availability_override:string}> } */
            dataFusion = parseFusionData(request.getData('fusion')),
            dataFusionAliases = Object.keys(dataFusion),
            decisionProvider,
            candidates,
            candidateAliases,
            decisionReason = '',
            decisionCname;

        allReasons = {
            primary_selected: 'A',
            failover_selected: 'B',
            default_selected: 'C'
        };

        /**
         * @param alias
         * @returns {boolean}
         */
        function filterPrimaryCandidates(alias) {
            return dataFusion[alias] !== undefined && dataFusion[alias].health_score !== undefined
                && dataFusion[alias].health_score.value > settings.fusion_sonar_threshold
                && (settings.providers[alias] !== undefined);
        }

        /**
         * @param alias
         * @returns {boolean}
         */
        function filterFailoverCandidates(alias) {
            return dataFusion[alias] !== undefined && dataFusion[alias].health_score !== undefined
                && dataFusion[alias].health_score.value > settings.fusion_sonar_threshold
                && (settings.failover_providers[alias] !== undefined);
        }

        // Check if "Big Red Button" isn't activated
        if (dataFusionAliases.length > 0 && dataFusion[dataFusionAliases[0]].availability_override === undefined) {
            candidates = filterObject(dataFusion, filterPrimaryCandidates);
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 1) {
                decisionProvider = candidateAliases[0];
                decisionReason = allReasons.primary_selected;
            } else if (candidateAliases.length !== 0) {
                decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
                decisionReason = allReasons.primary_selected;
            }

            if (!decisionProvider) {
                candidates = filterObject(dataFusion, filterFailoverCandidates);

                candidateAliases = Object.keys(candidates);

                if (candidateAliases.length === 1) {
                    decisionProvider = candidateAliases[0];
                    decisionCname = settings.failover_providers[decisionProvider].cname;
                    decisionReason = allReasons.failover_selected;
                } else if (candidateAliases.length !== 0) {
                    decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
                    decisionReason = allReasons.failover_selected;
                    decisionCname = settings.failover_providers[decisionProvider].cname;
                }
            }
        }

        if (!decisionProvider) {
            decisionProvider = settings.default_provider;
            decisionReason = allReasons.default_selected;

            decisionCname = settings.providers[decisionProvider] !== undefined ? settings.providers[decisionProvider].cname : settings.failover_providers[decisionProvider].cname;
        }

        response.respond(decisionProvider, decisionCname || settings.providers[decisionProvider].cname);
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
     * @param {!Object} data
     */
    function parseFusionData(data) {
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
