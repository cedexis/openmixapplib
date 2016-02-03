
var handler = new OpenmixApplication({
    /**
     * The list of available CNAMEs, keyed by alias.
     */
    providers: {
        'foo': {
            cname:'www.foo.com'
        },
        'bar': {
            cname: 'www.bar.com'
        },
        'baz': {
            cname: 'www.baz.com'
        },
        'qux': {
            cname: 'www.qux.com'
        }
    },

    availability_threshold: 80
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
        var dataAvail = request.getProbe('avail'),
            dataRtt = request.getProbe('http_rtt'),
            body,
            allReasons,
            decisionReason = '',
            candidates = dataRtt,
            candidatesAliases = Object.keys(candidates);

        allReasons = {
            best_performing_provider: 'A',
            data_problem: 'B',
            all_providers_eliminated: 'C'
        };

        /**
         * @param candidate
         * @param key
         */
        function filterAvailability(candidate, key) {
            return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
        }

        if (Object.keys(dataAvail).length > 0) {
            if (candidatesAliases.length > 0) {
                 // Remove unavailable providers
                candidates = filterObject(candidates, filterAvailability);
                candidatesAliases = Object.keys(candidates);

                if (candidatesAliases.length > 0) {
                    body = getLowestProvidersOrdered(candidates, 'http_rtt');
                    decisionReason = allReasons.best_performing_provider;
                }
            }
            if (body === undefined) {
                body = getHighestProvidersOrdered(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
        else {
            body = getRandomProviders(settings.providers);
            decisionReason = allReasons.data_problem;
        }

        for (var i= 0; i < body.length; i++) {
            response.addProviderHost(body[i], settings.providers[body[i]].cname);
        }
        response.setStatus(200);
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
            candidate = {};
        while (i --) {
            key = keys[i];
            if (filter(object[key], key)) {
                candidate[key] = object[key];
            }
        }
        return candidate;
    }

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

    /**
     * @param {!Object} source
     * @param {string} property
     */
    function getHighestProvidersOrdered(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            j = keys.length,
            key,
            candidate,
            candidatesArray= [],
            max = -Infinity,
            value;

        while (j--) {
            while (i--) {
                key = keys[i];
                value = source[key][property];
                if (candidatesArray.indexOf(key) === -1 && value > max) {
                    candidate = key;
                    max = value;
                }
            }
            candidatesArray.push(candidate);
            i = keys.length;
            max = -Infinity;
        }
        return candidatesArray;
    }

    /**
     * @param {!Object} source
     * @param {string} property
     */
    function getLowestProvidersOrdered(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            j = keys.length,
            key,
            candidate,
            candidatesArray= [],
            min = Infinity,
            value;

        while (j--) {
            while (i--) {
                key = keys[i];
                value = source[key][property];
                if (candidatesArray.indexOf(key) === -1 && value < min) {
                    candidate = key;
                    min = value;
                }
            }
            candidatesArray.push(candidate);
            i = keys.length;
            min = Infinity;
        }
        return candidatesArray;
    }

}
