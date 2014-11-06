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
    // when set to true, sonar data is used
    use_sonar_data: false,
    //Set Sonar threshold for availability for the platform to be included.
    // sonar values are between 0 - 1
    sonar_threshold: 0.95
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
        one_acceptable_provider: 'A',
        best_provider_selected: 'B',
        no_available_providers: 'C'
    };

    var aliases = Object.keys(settings.providers);

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
        var decisionTtl = settings.default_ttl,
            candidates,
            dataSonar = parseSonarData(request.getData('sonar')),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterInvalidRttScores),
            decisionProvider,
            reasonCode,
            candidateAliases;

        /**
         * @param candidate
         */
        function filterSonar(candidate, key) {
            return (typeof dataSonar[key] !== 'undefined' && dataSonar[key] >= settings.sonar_threshold);
        }

        //route based on rtt
        candidates = dataRtt;

        if (settings.use_sonar_data) {
            // filter sonar data
            candidates = filterObject(candidates, filterSonar);
        }

        candidateAliases = Object.keys(candidates);


        if (candidateAliases.length === 0) {
            // if non available / non rtt, return default provider
            decisionProvider = settings.default_provider;
            reasonCode = reasons.no_available_providers;
        } else if (candidateAliases.length === 1) {
            // if only one available, return available
            decisionProvider = candidateAliases[0];
            reasonCode = reasons.one_acceptable_provider;
        } else {
            // we've got more than 1 available / rtt provider, route based on rtt
            decisionProvider = getLowest(candidates, 'http_rtt');
            reasonCode = reasons.best_provider_selected;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(reasonCode);
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
     * @param {Object} candidate
     */
    function filterInvalidRttScores(candidate) {
        return candidate.http_rtt >= settings.min_valid_rtt_score;
    }

    /**
     * @param source
     * @param property
     */
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
    function parseSonarData(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];
            data[key] = parseFloat(data[key]);
        }
        return data;
    }

}
