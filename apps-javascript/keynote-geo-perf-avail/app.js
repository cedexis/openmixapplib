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
            decisionReason,
            allReasons,
            /** @type {!Object.<string, Object.<string, Object.<string, Object.<string, {avail_data:number, perf_data:number}>>>>} */
            dataFusion = parseFusionData(request.getData('fusion'));
        
        allReasons = {
            default_provider: 'A',
            one_aceptable_provider: 'B',
            best_provider_selected: 'C',
            no_available_keynote_provider: 'D',
            keynote_data_not_robust: 'E',
            random_available: 'F',
            no_country_market_selected: 'G'
        };

        function candidateHasPerfAvailScores(alias, node, geo_location) {
            return dataFusion[alias] !== undefined
                && dataFusion[alias][node] !== undefined
                && dataFusion[alias][node][geo_location] !== undefined
                && dataFusion[alias][node][geo_location].perf_data !== undefined
                && dataFusion[alias][node][geo_location].avail_data !== undefined
                && dataFusion[alias][node][geo_location].avail_data > settings.min_availability_threshold
                && dataFusion[alias][node][geo_location].perf_data < settings.max_perf_threshold;
        }

        function findKeynoteCandidates(node, geo_location) {
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (candidateHasPerfAvailScores(aliases[i], node, geo_location)) {
                    candidates[n ++] = aliases[i];
                }
            }

            return candidates;
        }

        // keynote data unavailable, return any random provider that passes the fusion test
        function selectAnyProvider(reason) {
            var candidates = findKeynoteCandidates('countries', request.country);

            if (candidates.length === 0) {
                candidates = findKeynoteCandidates('markets', request.market);
            }

            if (candidates.length === 0) {
                decisionProvider = settings.default_provider;
                decisionReason = allReasons.no_available_keynote_provider + allReasons.default_provider;
            }
            else if (candidates.length === 1) {
                decisionProvider = candidates[0];
                decisionReason = reason;
            }
            else {
                decisionProvider = candidates[(Math.random() * candidates.length) >> 0];
                decisionReason = allReasons.random_available + reason;
            }
        }

        function filterCandidates(alias) {
            if (candidateHasPerfAvailScores(alias, 'countries', request.country) ||
                candidateHasPerfAvailScores(alias, 'markets', request.market)) {
                return true;
            }
            return false;
        }

        function selectBestPerformingProvider(node, geo_location) {
            var aliases = Object.keys(dataFusion),
                i = aliases.length,
                alias,
                min = Infinity,
                score;

            while (i --) {
                alias = aliases[i];
                if (dataFusion[alias] !== undefined && dataFusion[alias][node] !== undefined
                    && dataFusion[alias][node][geo_location] !== undefined) {
                    score = dataFusion[alias][node][geo_location].perf_data;
                    if (score < min) {
                        decisionProvider = alias;
                        min = score;
                    }
                }
            }
        }

        // if we don't have fusion data for all providers, randomly select a provider
        if (Object.keys(dataFusion).length !== aliases.length){
            selectAnyProvider(allReasons.keynote_data_not_robust);
        }
        else {
            // get the keynote candidates that have country or market data for requestor geo location
            dataFusion = filterObject(dataFusion, filterCandidates);
            candidates = Object.keys(dataFusion);

            if (candidates.length === 0) {
                decisionProvider = settings.default_provider;
                decisionReason = allReasons.no_available_keynote_provider + allReasons.default_provider;
            }
            else if (candidates.length === 1) {
                decisionProvider = candidates[0];
                // log if only one candidate and it was a market rollup
                if (!candidateHasPerfAvailScores(decisionProvider, 'countries', request.country)
                    && candidateHasPerfAvailScores(decisionProvider, 'markets', request.market)) {
                    decisionReason = allReasons.no_country_market_selected + allReasons.one_aceptable_provider;
                } else {
                    decisionReason = allReasons.one_aceptable_provider;
                }
            }
            else {
                // we have more than 1 available provider, route on keynote performance data
                selectBestPerformingProvider('countries', request.country);
                if (decisionProvider !== undefined) {
                    decisionReason = allReasons.best_provider_selected;
                } else {
                    selectBestPerformingProvider('markets', request.market);
                    decisionReason = allReasons.no_country_market_selected + allReasons.best_provider_selected;
                }
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
