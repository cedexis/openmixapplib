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
    availability_threshold: 80,
    // To enforce a Sonar health-check, set this threshold value to 1. To ignore the health-check, set this value to 0.
    fusion_sonar_threshold: 1
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
        var dataAvail = request.getProbe('avail'),
            dataKbps = request.getProbe('http_kbps'),
            /** @type { !Object.<string, { health_score: { value:string }, availability_override:string}> } */
            dataFusion = parseFusionData(request.getData('fusion')),
            allReasons,
            decisionProvider,
            decisionReason = '',
            candidates = dataKbps,
            candidateAliases;
        
        allReasons = {
            best_performing_provider: 'A',
            all_providers_eliminated: 'B',
            data_problem: 'C'
        };
        
        /**
        * @param candidate
        * @param key
        * @returns {boolean}
        */
        function filterAvailability(candidate, key) {
            // Filter sonar and radar availability
            return dataFusion[key] !== undefined
                && dataFusion[key].health_score !== undefined
                && dataFusion[key].health_score.value >= settings.fusion_sonar_threshold
                && dataAvail[key] !== undefined
                && dataAvail[key].avail >= settings.availability_threshold;
        }
        
        // Check is there is not data problem
        if (Object.keys(candidates).length > 0
            && Object.keys(dataAvail).length > 0
            && Object.keys(dataFusion).length > 0
            && dataFusion[Object.keys(dataFusion)[0]].availability_override === undefined) {
            // Select the highest kbps provider
            // availability score, if given
            
            // Remove any that don't meet the Fusion Sonar threshold and Radar sonar threshold
            candidates = filterObject(candidates, filterAvailability);
            candidateAliases = Object.keys(candidates);
            
            // If there is one or more available choose the best
            if (candidateAliases.length > 0) {
                decisionProvider = getHighest(candidates, 'http_kbps');
                decisionReason = allReasons.best_performing_provider;
            } else {
                // If none available choose more available
                decisionProvider = getHighest(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
        
        // Data problem, choose default provider
        if (decisionProvider === undefined) {
            decisionProvider = settings.default_provider;
            decisionReason = allReasons.data_problem;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
    };

    /**
     * @param object
     * @param filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (!filter(object[key], key)) {
                delete object[key];
            }
        }
        return object;
    }
    
    /**
    * @param {!Object} source
    * @param {string} property
    */
    function getHighest(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;
        
        while (i --) {
            key = keys[i];
            value = source[key][property];
            if (value > max) {
                candidate = key;
                max = value;
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
