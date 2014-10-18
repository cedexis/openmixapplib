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
                { threshold: 10000, multiplier: 1.2 },
                { threshold: 7500, multiplier: 1.3 },
                { threshold: 5000, multiplier: 1.5 }
            ]
        },
        'bar': {
            usage: [
                { threshold: 20000, multiplier: 1.2 },
                { threshold: 25000, multiplier: 1.3 },
                { threshold: 30000, multiplier: 1.5 }
            ],
            bandwidth: [
                { threshold: 10000, multiplier: 1.2 },
                { threshold: 7500, multiplier: 1.3 },
                { threshold: 5000, multiplier: 1.5 }
            ]
        }
    },
    default_ttl: 20,
    error_ttl: 20,
    min_valid_rtt_score: 5,
    availability_threshold: 90
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
        best_performing: 'A',
        all_providers_eliminated: 'C',
        radar_data_sparse: 'E',
        fusion_data_problem: 'F',
        random_selection: 'G',
        missing_usage_data: 'H',
        missing_bandwidth_data: 'I'
    };

    var aliases = Object.keys(settings.providers);

    // Sort the burstable thresholds in descending order
    Object.keys(settings.burstable_cdns).forEach(function(alias) {
        function sort_desc(a, b) {
            return b.threshold - a.threshold;
        }

        if (typeof settings.burstable_cdns[alias].bandwidth !== 'undefined') {
            settings.burstable_cdns[alias].bandwidth.sort(sort_desc);
        }
        if (typeof settings.burstable_cdns[alias].usage !== 'undefined') {
            settings.burstable_cdns[alias].usage.sort(sort_desc);
        }
    });
    //console.log(JSON.stringify(settings.burstable_cdns));

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
        var data_avail = filter_object(request.getProbe('avail'), filter_empty),
            data_rtt = filter_object(request.getProbe('http_rtt'), filter_invalid_rtt_scores),
            data_fusion = parse_fusion_data(request.getData('fusion')),
            decision_provider,
            decision_ttl = settings.default_ttl,
            decision_reasons = [],
            candidates;

        /* jshint laxbreak:true */
        function get_padding_percent(alias, metric, error_reason) {
            var value,
                thresholds,
                i,
                len;

            if (typeof settings.burstable_cdns[alias] !== 'undefined'
                && typeof settings.burstable_cdns[alias][metric] !== 'undefined') {
                if (typeof data_fusion[alias] !== 'undefined'
                    && typeof data_fusion[alias][metric] !== 'undefined'
                    && typeof data_fusion[alias][metric].value !== 'undefined') {

                    value = parseFloat(data_fusion[alias][metric].value);
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
                    if (!~decision_reasons.indexOf(error_reason)) {
                        decision_reasons.push(error_reason);
                    }
                }
            }
            return 0;
        }

        function add_rtt_padding(data) {
            var aliases = Object.keys(data),
                i = aliases.length,
                alias,
                provider,
                base_padding,
                padding_pct;

            while (i --) {
                alias = aliases[i];
                provider = settings.providers[alias];
                base_padding = typeof provider.base_padding === 'undefined' ? 0 : provider.base_padding;
                padding_pct = get_padding_percent(alias, 'bandwidth', reasons.missing_bandwidth_data)
                    + get_padding_percent(alias, 'usage', reasons.missing_usage_data);
                data[alias].http_rtt = base_padding + ((1 + padding_pct) * data[alias].http_rtt);
            }
            return data;
        }

        function select_random_provider(reason) {
            decision_provider = aliases[Math.floor(Math.random() * aliases.length)];
            decision_reasons.push(reason);
            decision_ttl = settings.error_ttl;
        }

        if (Object.keys(data_rtt).length !== aliases.length || Object.keys(data_avail).length !== aliases.length) {
            select_random_provider(reasons.radar_data_sparse);
        }
        else if (Object.keys(data_fusion).length !== Object.keys(settings.burstable_cdns).length) {
            select_random_provider(reasons.fusion_data_problem);
        }
        else {
            data_avail = filter_object(data_avail, filter_availability);
            candidates = Object.keys(data_avail);

            if (candidates.length === 0) {
                select_random_provider(reasons.all_providers_eliminated);
            }
            else if (candidates.length === 1) {
                decision_provider = candidates[0];
                decision_reasons.push(reasons.best_performing);
            }
            else {
                data_rtt = add_rtt_padding(join_objects(data_rtt, data_avail, 'avail'));
                decision_provider = get_lowest(data_rtt, 'http_rtt');
                decision_reasons.push(reasons.best_performing);
            }
        }

        response.respond(decision_provider, settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filter_object(object, filter) {
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
    function filter_invalid_rtt_scores(candidate) {
        return candidate.http_rtt >= settings.min_valid_rtt_score;
    }

    /**
     * @param {{avail: number}} candidate
     */
    function filter_availability(candidate) {
        return candidate.avail >= settings.availability_threshold;
    }

    /**
     * @param {Object} candidate
     */
    function filter_empty(candidate) {
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

    /**
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function join_objects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (typeof source[key] !== 'undefined' && typeof source[key][property] !== 'undefined') {
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
    function parse_fusion_data(data) {
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
