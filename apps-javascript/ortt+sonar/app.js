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
    // when set true if one of the provider has not data it will be removed,
    // when set to false, sonar data is optional, so a provider with no sonar data will be used
    need_sonar_data: true,
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
        var decisionTtl = settings.default_ttl,
            candidates,
            dataSonar = parseSonarData(request.getData('sonar')),
            dataRtt = request.getProbe('http_rtt'),
            decisionProvider,
            decisionReason,
            candidateAliases,
            allReasons;
        
        allReasons = {
            one_acceptable_provider: 'A',
            best_provider_selected: 'B',
            no_available_providers: 'C',
            default_provider: 'D',
            sonar_data_not_robust: 'E',
            radar_rtt_not_robust: 'F'
        };

        /**
        * @param key
        */
        function filterInvalidRttScores(key) {
            return dataRtt[key] !== undefined && dataRtt[key].http_rtt >= settings.min_valid_rtt_score;
        }

        /**
         * @param key
         */
        function filterSonar(key) {
            // let the flag determine if the provider is available when we don't have sonar data for the provider
            if (dataSonar[key] === undefined) {
                return !settings.need_sonar_data;
            }
            return (dataSonar[key] >= settings.sonar_threshold);
        }

        /**
         * @param reason
         */
        function selectAnyProvider(reason) {
            // radar or sonar data not available, select any sonar available provider
            var i = aliases.length,
                n = 0,
                candidates = [];

            while (i --) {
                if (filterSonar(aliases[i])) {
                    candidates[n ++] = aliases[i];
                }
            }

            if (n === 0) {
                decisionProvider = settings.default_provider;
                decisionReason = allReasons.no_available_providers + allReasons.default_provider;
            } else if (n === 1) {
                decisionProvider = candidates[0];
                decisionReason = reason;
            } else {
                decisionProvider = candidates[(Math.random() * n) >> 0];
                decisionReason = reason;
            }
        }

        if (Object.keys(dataSonar).length !== aliases.length && settings.need_sonar_data) {
            selectAnyProvider(allReasons.sonar_data_not_robust);
        } else if (Object.keys(dataRtt).length !== aliases.length) {
            // if we don't have rtt, return any sonar available provider
            selectAnyProvider(allReasons.radar_rtt_not_robust);
        } else {
            // we've got radar and sonar data for all providers, filter out any unavailable sonar providers
            candidates = filterObject(dataRtt, filterInvalidRttScores);

            candidates = filterObject(candidates, filterSonar);
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 0) {
                // No available providers
                selectAnyProvider(allReasons.no_available_providers);
            }
            else if (candidateAliases.length === 1) {
                // if only one available, return available
                decisionProvider = candidateAliases[0];
                decisionReason = allReasons.one_acceptable_provider;
            }
            else {
                // we've got more than 1 available / rtt provider, route based on rtt
                decisionProvider = getLowest(candidates, 'http_rtt');
                decisionReason = allReasons.best_provider_selected;
            }
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
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

            if (!filter(key)) {
                delete object[key];
            }
        }

        return object;
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
