
var handler = new OpenmixApplication({
    /**
     * The list of available CNAMEs, keyed by alias.
     * Round Robin weight (these are relative to one another for purposes of
     * weighted random selection, but it may be useful to think of them as
     * percentages (i.e. they add up to 100).
     */
    providers: {
        'foo': {
            cname:'foo.com',
            weight: 20
        },
        'bar': {
            cname: 'bar.com',
            weight: 50
        },
        'baz': {
            cname: 'baz.com',
            weight: 10
        },
        'qux': {
            cname: 'qux.com',
            weight: 20
        }
    }
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

    /**
     * @param {OpenmixConfiguration} config
     */
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
        var body = [],
            allReasons,
            decisionReason = '',
            candidates = settings.providers,
            candidatesAliases = Object.keys(candidates),
            totalWeight,
            j,
            candidate;

        allReasons = {
            routed_by_weight: 'A',
            data_problem: 'B'
        };

        /**
         * @param candidates
         */
        function getTotalWeight(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                key,
                total = 0,
                weight;

            while (i --) {
                key = keys[i];
                weight = settings.providers[key].weight;

                if (weight !== undefined) {
                    total += weight;
                }
            }

            return total;
        }

        /**
         * @param candidates
         * @param max
         */
        function getWeightedRandom(candidates, max) {
            var random = Math.floor(Math.random() * max),
                mark = 0,
                keys = candidates,
                i = keys.length,
                key, weight;

            while (i --) {
                key = keys[i];
                weight  = settings.providers[key].weight;

                if (weight !== undefined) {
                    mark += weight;
                    if (random < mark) {
                        return key;
                    }
                }
            }
        }


        // Respond with a weighted random selection
        totalWeight = getTotalWeight(candidates);
        if (totalWeight > 0) {
            j = candidatesAliases.length;
            while (j--) {
                candidate = candidatesAliases.length > 1 ? getWeightedRandom(candidatesAliases, totalWeight) : candidatesAliases[0];
                if (candidate !== undefined) {
                    body.push(candidate);
                    candidatesAliases.splice(candidatesAliases.indexOf(candidate), 1);
                    totalWeight -= settings.providers[candidate].weight;
                }
            }
            decisionReason = allReasons.routed_by_weight;
        }

        if (body === undefined || body.length === 0) {
            body = getRandomProviders(settings.providers);
            decisionReason = allReasons.data_problem;
        }

        for (var i= 0; i < body.length; i++) {
            response.addProviderHost(body[i], settings.providers[body[i]].cname);
        }

        response.setStatus(200);
        response.setReasonCode(decisionReason);
    };

    function shuffle(source){
        for(var j, x, i = source.length; i; j = Math.floor(Math.random() * i), x = source[--i], source[i] = source[j], source[j] = x){}
        return source;
    }

    /**
     * @param {!Object} source
     */
    function getRandomProviders(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidatesArray = [];

        shuffle(keys);
        while (i--) {
            key = keys[i];
            candidatesArray.push(key);
        }

        return candidatesArray;
    }

}
