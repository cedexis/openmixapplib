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

    var reasons = {
        default_provider: 'A',
        one_acceptable_provider: 'B',
        best_provider_selected: 'C',
        error_condition: 'D',
        fusion_data_not_robust: 'E',
        radar_rtt_not_robust: 'F',
        no_available_fusion_providers: 'G'

    };

    var aliases = Object.keys(settings.providers);

    var json_cache = {},
        json_cache_index = {};

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
        var selected_provider,
            decision_ttl = settings.default_ttl,
            candidates,
            candidate_aliases,
            reason_code,
            data_fusion = parse_fusion_data(request.getData('fusion')),
            data_rtt = filter_object(request.getProbe('http_rtt'), filter_empty);

        function fusion_health_score_ok(provider) {
            // let the flag determine if the provider is available when we don't have fusion data for the provider
            if( typeof data_fusion[provider] === 'undefined') {
                return settings.no_health_score_ok;
            }

            // normally, the fusion recipe returns a health score of 3 or greater when the server is available
            return typeof data_fusion[provider].health_score !== 'undefined'
                && typeof data_fusion[provider].health_score.value !== 'undefined'
                && data_fusion[provider].health_score.value > 2;
        }

        // radar or fusion health_score data not available, select any fusion available provider
        function select_any_provider(reason) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (fusion_health_score_ok(aliases[i])) {
                    candidates[n ++] = aliases[i];
                }
            }

            if (n === 0) {
                selected_provider = settings.default_provider;
                reason_code = reasons.no_available_fusion_providers + reasons.default_provider;
            }
            else if (n === 1) {
                selected_provider = candidates[0];
                reason_code = reason;
            }
            else {
                selected_provider = candidates[(Math.random() * n) >> 0];
                reason_code = reason;
            }
        }

        if (Object.keys(data_fusion).length !== aliases.length && !settings.no_health_score_ok){
            select_any_provider(reasons.fusion_data_not_robust);
        }
        // if we don't have rtt, return any fusion available provider
        else if (Object.keys(data_rtt).length !== aliases.length) {
            select_any_provider(reasons.radar_rtt_not_robust);
        }
        else {
            // we've got radar and fusion data for all providers, filter out any unavailable fusion providers
            candidates = filter_object(data_rtt, fusion_health_score_ok);
            candidate_aliases = Object.keys(candidates);

            if (candidate_aliases.length === 0) {
                // No available providers
                select_any_provider(reasons.no_available_fusion_providers);
            }
            else if (candidate_aliases.length === 1) {
                selected_provider = candidate_aliases[0];
                reason_code = reasons.one_acceptable_provider;
            }
            else {
                // we've got more than 1 available provider, route based on rtt
                selected_provider = get_lowest(candidates, 'http_rtt');
                reason_code = reasons.best_provider_selected;
            }
        }

        response.respond(selected_provider, settings.providers[selected_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(reason_code);
    };

    function filter_object(object, filter) {
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
    function filter_empty(candidate) {
        for (var key in candidate) {
            return true;
        }
        return false;
    }

    function get_lowest(source, property) {
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

    function parse_fusion_data(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (!(data[key] = json_parse(key, data[key]))) {
                delete data[key];
            }
        }

        return data;
    }

    function json_parse(key, json) {
        if (json_cache_index[key] === json) {
            return json_cache[key];
        }
        else {
            json_cache_index[key] = json;

            try {
                return json_cache[key] = JSON.parse(json);
            }
            catch (e) {
                return json_cache[key] = false;
            }
        }
    }
}
