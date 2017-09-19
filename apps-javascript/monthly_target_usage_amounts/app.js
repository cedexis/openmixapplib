var handler = new OpenmixApplication({
    providers: {
        'foo': {
            cname: 'www.foo.com',
            base_padding: 0,
            targetMin: 20000,
            targetMax: 30000
        },
        'bar': {
            cname: 'www.bar.com',
            base_padding: 0
        },
        'baz': {
            cname: 'www.baz.com',
            base_padding: 0
        }
    },
    burstable_cdns: {
        'foo': {
            usage: [
                { max_threshold: 20000, multiplier: 1.2 },
                { max_threshold: 25000, multiplier: 1.3 },
                { max_threshold: 30000, multiplier: 1.5 }
            ],
            bandwidth: [
                { max_threshold: 5000, multiplier: 1.2 },
                { max_threshold: 7500, multiplier: 1.3 },
                { max_threshold: 10000, multiplier: 1.5 }
            ]
        },
        'bar': {
            usage: [
                { max_threshold: 20000, multiplier: 1.2 },
                { max_threshold: 25000, multiplier: 1.3 },
                { max_threshold: 30000, multiplier: 1.5 }
            ],
            bandwidth: [
                { max_threshold: 5000, multiplier: 1.2 },
                { max_threshold: 7500, multiplier: 1.3 },
                { max_threshold: 10000, multiplier: 1.5 }
            ]
        }
    },
    asn_to_provider: {
        7922: 'foo'
    },
    default_ttl: 20,
    error_ttl: 20,
    min_valid_rtt_score: 5,
    availability_threshold: 90,
    enable_usage_target_min_routing: true,
    enable_usage_target_max_routing: true,
    enable_max_threshold_routing: false,
    /* usage_strictness (0-1) this is a variable (eg. 0.1) to control the effect of the usage target routing penalties.
        greater than zero means stricter adherance to hitting the desired usage targets.
        value = 1 essentially negates any smoothing that we're doing with respect to how long we have before the end of the month
        (the urgency of getting the usage into an acceptable range.)*/
    usage_strictness: 0.5
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
        missing_bandwidth_data: 'I',
        asn_override: 'J'
    };

    if (settings.enable_max_threshold_routing === true) {
        // Sort the burstable thresholds in descending order
        Object.keys(settings.burstable_cdns).forEach(function(alias) {
            function sort_desc(a, b) {
                return b.max_threshold - a.max_threshold;
            }

            if (settings.burstable_cdns[alias].bandwidth !== undefined) {
                settings.burstable_cdns[alias].bandwidth.sort(sort_desc);
            }
            if (settings.burstable_cdns[alias].usage !== undefined) {
                settings.burstable_cdns[alias].usage.sort(sort_desc);
            }
        });
    }

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = filterObject(request.getProbe('avail'), filterEmpty),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterInvalidRttScores),
            dataFusion = parseFusionData(request.getData('fusion')),
            decisionProvider,
            decisionTtl = settings.default_ttl,
            decisionReason = [],
            candidates,
            currentDate = new Date(),
            timeOfMonth = getCurrentSecondsOfMonth(currentDate),
            durationOfMonth = getTotalSecondsOfMonth(currentDate),
            elapsedMonth = timeOfMonth / durationOfMonth,
            totalCurrentMinUsageTarget = 0,
            totalCurrentUsage = 0,
            asn = request.asn;

        /**
         * @param alias
         * @returns {number}
         */
        function getTargetUsagePenalty(alias) {
            var currentMinUsageTarget,
                currentMaxUsageTarget,
                devianceMinUsage,
                devianceMaxUsage,
                usage;

            if (dataFusion[alias] !== undefined
                && dataFusion[alias].usage.value !== undefined
                && settings.providers[alias] !== undefined
                && settings.providers[alias].targetMin !== undefined
                && settings.providers[alias].targetMax !== undefined) {

                usage = parseFloat(dataFusion[alias].usage.value);

                currentMinUsageTarget = settings.providers[alias].targetMin * elapsedMonth;
                currentMaxUsageTarget = settings.providers[alias].targetMax * elapsedMonth;
                devianceMinUsage = usage / currentMinUsageTarget;
                devianceMaxUsage = usage / currentMaxUsageTarget;

                totalCurrentMinUsageTarget += currentMinUsageTarget;
                totalCurrentUsage += usage;

                if (settings.enable_usage_target_min_routing === true
                    && usage < currentMinUsageTarget) {
                    return 1 - ((1 - devianceMinUsage) * (elapsedMonth + (1 - elapsedMonth) * settings.usage_strictness));
                } else if (settings.enable_usage_target_max_routing === true
                    && usage > currentMaxUsageTarget) {
                    return 1 - ((1 - devianceMaxUsage) * (elapsedMonth + (1 - elapsedMonth) * settings.usage_strictness));
                }
            }
            return 1;
        }

        /* jshint laxbreak:true */
        /**
         * @param alias
         * @param metric
         * @param error_reason
         * @returns {number}
         */
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
                        if (value >= thresholds[i].max_threshold) {
                            //console.log('hit threshold: ' + JSON.stringify(thresholds[i]));
                            return (value / thresholds[i].max_threshold - 1) * thresholds[i].multiplier;
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

        /**
         * @param data
         * @returns {*}
         */
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

                if (data[alias] !== undefined) {

                    if (settings.enable_max_threshold_routing === true) {
                        padding_pct = getPaddingPercent(alias, 'bandwidth', reasons.missing_bandwidth_data)
                            + getPaddingPercent(alias, 'usage', reasons.missing_usage_data);
                        data[alias].http_rtt = base_padding + ((1 + padding_pct) * data[alias].http_rtt);
                    }

                    if (settings.enable_usage_target_min_routing === true || settings.enable_usage_target_max_routing === true) {
                        data[alias].http_rtt *= getTargetUsagePenalty(alias);
                    }
                }
            }
            return data;
        }

        /**
         * @param reason
         */
        function selectRandomProvider(reason) {
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason.push(reason);
            decisionTtl = settings.error_ttl;
        }

        if (Object.keys(dataRtt).length !== aliases.length || Object.keys(dataAvail).length !== aliases.length) {
            selectRandomProvider(reasons.radar_data_sparse);
        }
        else if (Object.keys(dataFusion).length === 0) {
            selectRandomProvider(reasons.fusion_data_problem);
        }
        else {
            dataAvail = filterObject(dataAvail, filterAvailability);
            candidates = Object.keys(dataAvail);

            if (candidates.length === 0) {
                selectRandomProvider(reasons.all_providers_eliminated);
            }
            else if (candidates.length === 1) {
                decisionProvider = candidates[0];
                decisionReason.push(reasons.best_performing);
            }
            else {
                dataRtt = addRttPadding(intersectObjects(dataRtt, dataAvail, 'avail'));

                // Check asn override
                if (totalCurrentUsage > totalCurrentMinUsageTarget && settings.asn_to_provider[asn] !== undefined) {
                    decisionProvider = settings.asn_to_provider[asn];
                    decisionReason.push(reasons.asn_override);
                } else {
                    decisionProvider = getLowest(dataRtt, 'http_rtt');
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
			data = {},
			key;
		while (i --) {
			key = keys[i];
			if (filter(object[key], key)) {
				data[key] = object[key];
			}
		}
		return data;
	}

	/**
     * @param {Object} candidate
     */
    function filterInvalidRttScores(candidate) {
        return candidate.http_rtt >= settings.min_valid_rtt_score;
    }

    /**
     * @param {{avail: number}} candidate
     */
    function filterAvailability(candidate) {
        return candidate.avail >= settings.availability_threshold;
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
     * @param source
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
			key,
			candidates = {};
		while (i --) {
			key = keys[i];
			if (source[key] !== undefined && source[key][property] !== undefined) {
				candidates[key] = target[key];
				candidates[key][property] = source[key][property];
			}
		}
		return candidates;
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

    /**
     * @param currentDate
     * @returns {number}
     */
    function getCurrentSecondsOfMonth(currentDate) {
        var now = currentDate.getTime(),
            monthStart = new Date(now);

        monthStart.setDate(1);
        monthStart.setHours(0);
        monthStart.setMinutes(0);
        monthStart.setSeconds(0);
        monthStart.setMilliseconds(0);
        return Math.floor((now - monthStart.getTime()) / 1000);
    }

    /**
     * @param currentDate
     * @returns {number}
     */
    function getTotalSecondsOfMonth(currentDate) {
        return (new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate()) * 24 * 60 * 60;
    }
}
