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

    // TODO set to true if fusion data is required for all platforms, otherwise platforms with no fusion data are considered 'available'
    fusion_data_required: false,

    // TODO any provider with a health_score <= this value will be 'unavailable'
    failed_health_score: 1
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

    var reasons = {
        default_provider: 'Default Provider',
        one_acceptable_provider: 'Only One Platform',
        best_provider_selected: 'Optimal Selected',
        fusion_data_not_robust: 'No Fusion Data',
        no_available_fusion_providers: 'No Available Fusion Platforms',
        fusion_data_error: 'Fusion Data Error',
        radar_rtt_not_robust: 'No Radar Data',
        monitoring_alert: 'Alert Down'
    };

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
            dataFusion = parseFusionData(request.getData('fusion')),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterEmpty);

        // determine if the provider has fusion data and if the fusion data health_score is good
        function fusionHealthScoreOk(provider) {
            // if fusion data is not required and we don't have fusion data for the provider, the candidate is considered 'available'
            if (dataFusion[provider] === undefined) {
                return !settings.fusion_data_required;
            }

            return dataFusion[provider] !== undefined
                && dataFusion[provider] > settings.failed_health_score;
        }

        // if we end up here, we are missing radar or fusion data and fusion data is required
        // try to figure out the best provider based on fusion health_scores
        function selectAnyProvider(reason) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (fusionHealthScoreOk(aliases[i])) {
                    candidates[n ++] = aliases[i];
                }
            }
            // no candidates with good fusion data, select default_provider
            if (n === 0) {
                decisionProvider = settings.default_provider;
                decisionReason = reasons.no_available_fusion_providers + ', ' + reasons.default_provider;
            } else if (n === 1) {
                decisionProvider = candidates[0];
                decisionReason = reason;
            } else {
                decisionProvider = getLowest(dataRtt, 'http_rtt');
                decisionReason = reason;
            }
        }

        // Main request processing logic below

        // if we had a  exception, log and bail with default_provider
        if ( dataFusion !== undefined && dataFusion.bad_json_data !== undefined) {
            decisionProvider = settings.default_provider;
            decisionReason = reasons.fusion_data_error;

        // check if fusion data is required for all providers
        } else if (Object.keys(dataFusion).length !== aliases.length && settings.fusion_data_required) {
            selectAnyProvider(reasons.fusion_data_not_robust);
        }
        // TODO, this template uses rtt probe in conjunction with fusion custom data.  However, you can use any radar probe or no probes at all.
        else if (Object.keys(dataRtt).length !== aliases.length) {
            selectAnyProvider(reasons.radar_rtt_not_robust);
        } else {
            // we've got radar and fusion data for all providers, filter out any unavailable fusion providers
            candidates = filterObject(dataRtt, fusionHealthScoreOk);
            candidateAliases = Object.keys(candidates);

            var alert = (Object.keys(dataRtt).length != Object.keys(candidates).length);

            if (candidateAliases.length === 0) {
                selectAnyProvider(reasons.no_available_fusion_providers);
            }
            else if (candidateAliases.length === 1) {
                // Check if there are platforms excluded due to Fusion data
                if (alert) {
                    decisionReason = reasons.monitoring_alert;
                } else {
                    decisionReason = reasons.one_acceptable_provider;
                }

                decisionProvider = candidateAliases[0];
            } else {  
                // Check if there are platforms excluded due to Fusion data              
                if (alert) {
                    decisionReason = reasons.monitoring_alert + ', ' + reasons.best_provider_selected;
                }

                decisionReason = reasons.best_provider_selected;

                // TODO we've got more than 1 available provider, this template app routes on best rtt.
                // Change here if you want to insert additional logic such as rtt handicap based on fusion custom data score
                decisionProvider = getLowest(candidates, 'http_rtt');
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

    // if desired, here's the logic to return the best rtt
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

    // used for determining the provider with the best fusion health score
    function getHighest(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -1,
            value;

        while (i --) {
            key = keys[i];
            value = source[key];

            if (value > max) {
                candidate = key;
                max = value;
            }
        }

        return candidate;
    }

    /**
     * Replace the customer provided fusion data with the calculated health_score
     *
     * @param {!string} key - the provider alias
     * @param {!Object.<string,{loadpercentage:number}|number>} data - the customer's fusion data feed keyed on provider alias
     */
    // TODO add the logic to convert the customer json feed to a health score value
    function convertToHealthScore(key, data) {

        if (data[key] !== undefined && data[key].status !== undefined) {
            if (data[key].status == "Alert" ){
                data[key] = settings.failed_health_score;
            } else {
                data[key] = settings.failed_health_score + 1;
            }

        } else {
            data[key] = settings.failed_health_score + 1;
        }
    }

    function parseFusionData(data) {
        try {
            var keys = Object.keys(data),
                i = keys.length,
                key;

            while (i --) {
                key = keys[i];

                if (!(data[key] = JSON.parse(data[key]))) {
                    delete data[key];
                } else {
                    convertToHealthScore(key, data);
                }
            }
            // example data object:  { provider_alise1:5, provider_alias2:4, provider_alias3: 0}
            return data;
        } catch(e) {
            return {bad_json_data: true};
        }
    }

}
