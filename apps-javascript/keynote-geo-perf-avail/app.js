/*
    Fusion Keynote OM application template - dns decision based on keynote agent geo location performance
    and availability scores.

    This app requires fusion Keynote recipe installation and does not use radar data.

    The app first determines if there are any platforms with keynote fusion data in the requestor country.
    If so, the app routes to the lowest keynote performance score (rtt in seconds) for that country.

    If there are no keynote agent measurements in the requestor country, the app rolls up to market and routes
    based on market performance scores.  The default provider is selected if no geo match for requestor country
    or market is available.

*/
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

    // keynote rtt, any performance measurement slower (greater than) this value will not be considered a candidate
    max_perf_threshold: 15,

    // keynote availability, any availability score less than this value will not be considered a candidate
    min_availability_threshold: 90
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
        one_aceptable_provider: 'B',
        best_provider_selected: 'C',
        no_available_keynote_provider: 'D',
        keynote_data_not_robust: 'E',
        random_available: 'F',
        no_country_market_selected: 'G'
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
            reason_code,
            market_selected = false,
            /** @type {!Object.<string, Object.<string, Object.<string, Object.<string, {avail_data:number, perf_data:number}>>>>} */ 
            data_fusion = parse_fusion_data(request.getData('fusion'));

        function candidate_has_perf_avail_scores(alias, node, geo_location) {
            return typeof data_fusion[alias] !== 'undefined'
                && typeof data_fusion[alias][node] !== 'undefined'
                && typeof data_fusion[alias][node][geo_location] !== 'undefined'
                && typeof data_fusion[alias][node][geo_location].perf_data !== 'undefined'
                && typeof data_fusion[alias][node][geo_location].avail_data !== 'undefined'
                && data_fusion[alias][node][geo_location].avail_data  > settings.min_availability_threshold
                && data_fusion[alias][node][geo_location].perf_data  < settings.max_perf_threshold;
        }

        function find_keynote_candidates(node, geo_location) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (candidate_has_perf_avail_scores(aliases[i],node,geo_location)) {
                    candidates[n ++] = aliases[i];
                }
            }

            return candidates;
        }

        // radar data unavailable, return any random provider that passes the fusion test
        function select_any_provider(reason) {

            var candidates = find_keynote_candidates('countries', request.country);

            if( candidates.length === 0) {
                candidates = find_keynote_candidates('markets', request.market);
            }

            if (candidates.length === 0) {
                selected_provider = settings.default_provider;
                reason_code = reasons.no_available_keynote_provider + reasons.default_provider;
            }
            else if (candidates.length === 1) {
                selected_provider = candidates[0];
                reason_code = reason;
            }
            else {
                selected_provider = candidates[(Math.random() * candidates.length) >> 0];
                reason_code = reasons.random_available + reason;
            }
        }

        function filter_candidates(alias) {
            if( candidate_has_perf_avail_scores(alias, 'countries', request.country) ||
                candidate_has_perf_avail_scores(alias, 'markets', request.market)) {
                return true;
            }
            return false;
        }

        function set_market_selected(value) {
            market_selected = value;
        }

        // if we don't have fusion data for all providers, randomly select a provider
        if (Object.keys(data_fusion).length !== aliases.length){
            select_any_provider(reasons.keynote_data_not_robust);
        }

        else {
            // get the keynote candidates that have country or market data for requestor geo location
            data_fusion = filter_object(data_fusion, filter_candidates);
            candidates = Object.keys(data_fusion);

            if (candidates.length === 0) {
                selected_provider = settings.default_provider;
                reason_code = reasons.no_available_keynote_provider + reasons.default_provider;
            }
            else if (candidates.length === 1) {
                selected_provider = candidates[0];
                // log if only one candidate and it was a market rollup
                if( !candidate_has_perf_avail_scores(selected_provider, 'countries', request.country) &&  candidate_has_perf_avail_scores(selected_provider, 'markets', request.market)) {
                    reason_code = reasons.no_country_market_selected + reasons.one_aceptable_provider;
                }else {
                    reason_code = reasons.one_aceptable_provider;
                }
            }
            else {
                // we've got more than 1 available provider, route on keynote performance data
                selected_provider = get_lowest(data_fusion, request.country, request.market, set_market_selected);
                if( market_selected) {
                    reason_code = reasons.no_country_market_selected + reasons.best_provider_selected;
                }else {
                    reason_code = reasons.best_provider_selected;
                }
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

    function get_lowest(fusion_data, country, market, market_selected) {
        var keys = Object.keys(fusion_data),
            i = keys.length,
            key,
            country_candidate,
            country_min = Infinity,
            country_score,
            market_candidate,
            market_min = Infinity,
            market_score;

        while (i --) {
            key = keys[i];
            if(typeof fusion_data[key]['countries'][country] !== 'undefined') {
                country_score = fusion_data[key]['countries'][country].perf_data;
            }

            if (typeof country_score !== 'undefined'  && country_score < country_min) {
                country_candidate = key;
                country_min = country_score;
            }
            else {
                market_score = fusion_data[key]['markets'][market].perf_data;
                if(market_score < market_min) {
                    market_candidate = key;
                    market_min = market_score;
                }
            }
        }

        if( typeof country_candidate !== 'undefined') {
            return country_candidate
        }
        market_selected(true);
        return market_candidate;
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
