var handler = new OpenmixApplication({
    providers: {
        'foo': {
            cname: 'www.foo.com',
            base_padding: 0
        },
        'bar': {
            cname: 'www.bar.com',
            base_padding: 0
        },
        'baz': {
            cname: 'www.baz.com',
            base_padding: 0
        },
        'qux': {
            cname: 'www.qux.com',
            base_padding: 0
        }
    },
    burstable_cdns: {
        'foo': {
            usage: [
                { threshold: 20000, multiplier: 1.2 },
                { threshold: 25000, multiplier: 1.3 },
                { threshold: 30000, multiplier: 1.5 }
            ],
            bandwidth: [
                { threshold: 5000, multiplier: 1.2 },
                { threshold: 7500, multiplier: 1.3 },
                { threshold: 10000, multiplier: 1.5 }
            ]
        },
        'bar': {
            usage: [
                { threshold: 20000, multiplier: 1.2 },
                { threshold: 25000, multiplier: 1.3 },
                { threshold: 30000, multiplier: 1.5 }
            ],
            bandwidth: [
                { threshold: 5000, multiplier: 1.2 },
                { threshold: 7500, multiplier: 1.3 },
                { threshold: 10000, multiplier: 1.5 }
            ]
        }
    },
    //platforms that have sonar enabled
    sonarProviders: ['baz', 'qux'],
    default_ttl: 20,
    error_ttl: 20,
    min_valid_rtt_score: 5,
    availability_threshold: 90,
    fusion_sonar_threshold: 2,
    //set it true if you want to filter the candidates by avail techniques, otherwise set it to false
    //both options can be set to true or false.
    use_radar_avail: true,
    use_sonar_avail: true
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

    var reasons = {
        best_performing: 'A',
        all_providers_eliminated: 'C',
        radar_data_sparse: 'E',
        fusion_data_problem: 'F',
        random_selection: 'G',
        missing_usage_data: 'H',
        missing_bandwidth_data: 'I'
    };

    // Sort the burstable thresholds in descending order
    Object.keys(settings.burstable_cdns).forEach(function(alias) {
        function sort_desc(a, b) {
            return b.threshold - a.threshold;
        }

        if (settings.burstable_cdns[alias].bandwidth !== undefined) {
            settings.burstable_cdns[alias].bandwidth.sort(sort_desc);
        }
        if (settings.burstable_cdns[alias].usage !== undefined) {
            settings.burstable_cdns[alias].usage.sort(sort_desc);
        }
    });

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = filterObject(request.getProbe('avail'), filterEmpty),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterInvalidRttScores),
            /** @type { !Object.<string, { health_score: { value:string }, availability_override:string}> } */
            dataFusion = parseFusionData(request.getData('fusion')),
            decisionProvider,
            decisionTtl = settings.default_ttl,
            decisionReason = [],
            candidates = settings.providers,
            candidatesAliases = Object.keys(candidates);

        /* jshint laxbreak:true */
        function getPaddingPercent(alias, metric, error_reason) {
            var value,
                thresholds,
                i,
                len;

            if (settings.burstable_cdns[alias] !== undefined
                && settings.burstable_cdns[alias][metric] !== undefined) {
                if (dataFusion[alias] !== undefined
                    && dataFusion[alias][metric] !== undefined
                    && dataFusion[alias][metric].value !== undefined) {

                    value = parseFloat(dataFusion[alias][metric].value);
                    thresholds = settings.burstable_cdns[alias][metric];

                    for (i = 0, len = thresholds.length; i < len; i ++) {
                        if (value >= thresholds[i].threshold) {
                            //console.log('hit threshold: ' + JSON.stringify(thresholds[i]));
                            return (value / thresholds[i].threshold - 1) * thresholds[i].multiplier;
                        }
                    }
                }
                else {
                    // No padding, but note the reason
                    if (!~decisionReason.indexOf(error_reason)) {
                        decisionReason.push(error_reason);
                    }
                }
            }
            return 0;
        }

        function addRttPadding(data) {
            var aliases = Object.keys(data),
                i = aliases.length,
                alias,
                provider,
                base_padding,
                padding_pct;

            while (i --) {
                alias = aliases[i];
                provider = settings.providers[alias];
                base_padding = provider.base_padding === undefined ? 0 : provider.base_padding;
                padding_pct = getPaddingPercent(alias, 'bandwidth', reasons.missing_bandwidth_data)
                    + getPaddingPercent(alias, 'usage', reasons.missing_usage_data);
                if (data[alias] !== undefined) {
                    data[alias].http_rtt = base_padding + ((1 + padding_pct) * data[alias].http_rtt);    
                }
            }
            return data;
        }

        function selectRandomProvider(reason) {
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason.push(reason);
            decisionTtl = settings.error_ttl;
        }


        // determine which providers have a sonar value below threshold
        /**
         * @param candidate
         * @param alias
         */
        function filterFusionSonar(candidate, alias) {
            return settings.sonarProviders.indexOf(alias) !== -1 &&
                dataFusion[alias] !== undefined &&
                dataFusion[alias].health_score !== undefined &&
                dataFusion[alias].availability_override === undefined &&
                dataFusion[alias].health_score.value <= settings.fusion_sonar_threshold;
        }

        /**
         * @param candidate
         * @param key
         * @returns {boolean}
         */
        function filterAvailability(candidate, key) {
            return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
        }


        if (Object.keys(dataRtt).length !== aliases.length || Object.keys(dataAvail).length !== aliases.length) {
            selectRandomProvider(reasons.radar_data_sparse);
        }
        else if (Object.keys(dataFusion).length <= 0) {
            selectRandomProvider(reasons.fusion_data_problem);
        }
        else {
            if (settings.use_sonar_avail) {
                //filter the candidates with RAX sonar
                candidates = filterObject(candidates, filterFusionSonar);
                candidatesAliases = Object.keys(candidates);
            }
            if (candidatesAliases.length === 0) {
                selectRandomProvider(reasons.all_providers_eliminated);
            }
            else {
                if (settings.use_radar_avail) {
                    candidates = filterObject(candidates, filterAvailability);
                    candidatesAliases = Object.keys(candidates);
                }
                if (candidatesAliases.length === 0) {
                    selectRandomProvider(reasons.all_providers_eliminated);
                }
                else if (candidatesAliases.length === 1) {
                    decisionProvider = candidatesAliases[0];
                    decisionReason.push(reasons.best_performing);
                }
                else {
                    candidates = addRttPadding(intersectObjects(candidates, dataRtt, 'http_rtt'));
                    decisionProvider = getLowest(candidates, 'http_rtt');
                    decisionReason.push(reasons.best_performing);
                }
            }
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReason.join(','));
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            candidates = {};

        while (i --) {
            key = keys[i];

            if (filter(object[key], key)) {
                candidates[key] = object[key];
            }
        }

        return candidates;
    }

    /**
     * @param {Object} candidate
     */
    function filterInvalidRttScores(candidate) {
        return candidate.http_rtt >= settings.min_valid_rtt_score;
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

    /**
     * @param {!Object} source
     * @param {string} property
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
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function intersectObjects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (source[key] !== undefined && source[key][property] !== undefined) {
                target[key][property] = source[key][property];
            }
            else {
                delete target[key];
            }
        }

        return target;
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
