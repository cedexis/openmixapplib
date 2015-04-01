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
    default_ttl: 90,
    min_valid_rtt_score: 5,

    // when set to false, all providers must have fusion data.  when set to true, fusion data is optional
    no_health_score_ok: false
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
        var decisionProvider,
            decisionTtl = settings.default_ttl,
            candidates,
            candidateAliases,
            decisionReason,
            allReasons,
            /**
             * A data object to store data from Fusion
             *
             * @type { !Object.<string, { health_score: { value:string } }> }
             */
            dataFusion = parseFusionData(request.getData('fusion')),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterEmpty);
        
        allReasons = {
            default_provider: 'A',
            one_acceptable_provider: 'B',
            best_provider_selected: 'C',
            error_condition: 'D',
            fusion_data_not_robust: 'E',
            radar_rtt_not_robust: 'F',
            no_available_fusion_providers: 'G'

        };

        function fusionHealthScoreOk(provider) {
            // let the flag determine if the provider is available when we don't have fusion data for the provider
            if (dataFusion[provider] === undefined) {
                return settings.no_health_score_ok;
            }

            // normally, the fusion recipe returns a health score of 3 or greater when the server is available
            return dataFusion[provider].health_score !== undefined
                && dataFusion[provider].health_score.value !== undefined
                && dataFusion[provider].health_score.value > 2;
        }

        // radar or fusion health_score data not available, select any fusion available provider
        function selectAnyProvider(reason) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (fusionHealthScoreOk(aliases[i])) {
                    candidates[n ++] = aliases[i];
                }
            }

            if (n === 0) {
                decisionProvider = settings.default_provider;
                decisionReason = allReasons.no_available_fusion_providers + allReasons.default_provider;
            }
            else if (n === 1) {
                decisionProvider = candidates[0];
                decisionReason = reason;
            }
            else {
                decisionProvider = candidates[(Math.random() * n) >> 0];
                decisionReason = reason;
            }
        }

        if (Object.keys(dataFusion).length !== aliases.length && !settings.no_health_score_ok){
            selectAnyProvider(allReasons.fusion_data_not_robust);
        }
        // if we don't have rtt, return any fusion available provider
        else if (Object.keys(dataRtt).length !== aliases.length) {
            selectAnyProvider(allReasons.radar_rtt_not_robust);
        }
        else {
            // we've got radar and fusion data for all providers, filter out any unavailable fusion providers
            candidates = filterObject(dataRtt, fusionHealthScoreOk);
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 0) {
                // No available providers
                selectAnyProvider(allReasons.no_available_fusion_providers);
            }
            else if (candidateAliases.length === 1) {
                decisionProvider = candidateAliases[0];
                decisionReason = allReasons.one_acceptable_provider;
            }
            else {
                // we've got more than 1 available provider, route based on rtt
                decisionProvider = getLowest(candidates, 'http_rtt');
                decisionReason = allReasons.best_provider_selected;
            }
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReason);
    };

    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (!filter(key)) {
                delete object[key];
            }
        }

        return object;
    }

    /**
     * @param {Object} candidate
     */
    function filterEmpty(candidate) {
        var key;
        for (key in candidate) {
            return true;
        }
        return false;
    }

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
