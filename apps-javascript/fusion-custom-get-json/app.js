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

    var reasons = {
        default_provider: 'A',
        one_acceptable_provider: 'B',
        best_provider_selected: 'C',
        fusion_data_not_robust: 'D',
        no_available_fusion_providers: 'E',
        fusion_data_error: 'F'
    };

    var aliases = Object.keys(settings.providers);

    // we cache the fusion json data to reduce calls to the expensive JSON.parse(...)
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

        // determine if the provider has fusion data and if the fusion data health_score is good 
        function fusion_health_score_ok(provider) {
            // if fusion data is not required and we don't have fusion data for the provider, the candidate is considered 'available'
            if( typeof data_fusion[provider] === 'undefined') {
                return !settings.fusion_data_required;
            }

            return typeof data_fusion[provider] !== 'undefined'
                && data_fusion[provider] > settings.failed_health_score;
        }

        // if we end up here, we are missing radar or fusion data and fusion data is required
        // try to figure out the best provider based on fusion health_scores
        function select_any_provider(reason) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (fusion_health_score_ok(aliases[i])) {
                    candidates[n ++] = aliases[i];
                }
            }
            // no candidates with good fusion data, select default_provider
            if (n === 0) {
                selected_provider = settings.default_provider;
                reason_code = reasons.no_available_fusion_providers + reasons.default_provider;
            }else if (n === 1) {
                selected_provider = candidates[0];
                reason_code = reason;
            }else {
                selected_provider = get_highest(data_fusion);
                reason_code = reason;
            }
        }

        // Main request processing logic below

        // if we had a JSON.parse exception, log and bail with default_provider 
        if( typeof data_fusion !== 'undefined' && typeof data_fusion['bad_json_data'] !== 'undefined') {
            selected_provider = settings.default_provider;
            reason_code = reasons.fusion_data_error;

        // check if fusion data is required for all providers    
        }else if (Object.keys(data_fusion).length !== aliases.length && settings.fusion_data_required) {
            select_any_provider(reasons.fusion_data_not_robust);
        }
        // TODO, this template uses rtt probe in conjunction with fusion custom data.  However, you can use any radar probe or no probes at all.  
        else if (Object.keys(data_rtt).length !== aliases.length) {
            select_any_provider(reasons.radar_rtt_not_robust);
        }
        else {
            // we've got radar and fusion data for all providers, filter out any unavailable fusion providers
            candidates = filter_object(data_rtt, fusion_health_score_ok);
            candidate_aliases = Object.keys(candidates);

            if (candidate_aliases.length === 0) {
                select_any_provider(reasons.no_available_fusion_providers);
            }
            else if (candidate_aliases.length === 1) {
                selected_provider = candidate_aliases[0];
                reason_code = reasons.one_acceptable_provider;
            }
            else {
                // TODO we've got more than 1 available provider, this template app routes on best rtt.  
                // Change here if you want to insert additional logic such as rtt handicap based on fusion custom data score
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

    // if desired, here's the logic to return the best rtt
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
    // used for determining the provider with the best fusion health score
    function get_highest(source) {
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

        return candidate
    }

    /**
     * Replace the customer provided fusion data with the calculated health_score
     * 
     * @param {String} key - the provider alias
     * @param {Object} data - the customer's fusion data feed keyed on provider alias
     */
    // TODO add the logic to convert the customer json feed to a health score value
    function convert_to_health_score(key, data) {

        // this is a contrived example to illustrate converting to a health score based on the fusion custom data we get in the test script
        // In this logic, whatever provider has a value above settings.failed_health_score will be considered  'available' 
        if( typeof data[key] !== 'undefined' && typeof data[key].loadpercentage !== 'undefined') {
            if(data[key].loadpercentage <= 50 ){
                data[key] = 5;
            }else if(data[key].loadpercentage < 60) {
                data[key] = 4;
            }else if(data[key].loadpercentage < 70) {
                data[key] = 3;
            }else if(data[key].loadpercentage < 80) {
                data[key] = 2;
            }else {
                data[key] = settings.failed_health_score;
            }
        }else {
            data[key] = settings.failed_health_score;
        }
    }

    /**
     * @param {String} data - the customer's json data feed in raw string format
     * @return {Object} - the coverted object of provider_alias and health score
     */
    function parse_fusion_data(data) {
        try {
            var keys = Object.keys(data),
                i = keys.length,
                key;

            while (i --) {
                key = keys[i];

                if (!(data[key] = json_parse(key, data[key]))) {
                    delete data[key];
                }else {
                    convert_to_health_score(key, data)
                }
            }
            // example data object:  { provider_alise1:5, provider_alias2:4, provider_alias3: 0}
            return data;
        }catch(e) {
            return {bad_json_data: true};
        }
    }

    function json_parse(key, json) {
        if (json_cache_index[key] === json) {
            return json_cache[key];
        }
        else {
            json_cache_index[key] = json;
            return json_cache[key] = JSON.parse(json);
        }
    }
}
