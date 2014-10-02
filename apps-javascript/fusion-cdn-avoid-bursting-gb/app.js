
var handler;

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var reasons = {
        best_performing: 'A',
        data_problem: 'B',
        all_providers_eliminated: 'C',
        missing_usage_data: 'D',
        radar_data_sparse: 'E',
        missing_fusion_data: 'F'
    };

    function sort_thresholds_in_descending_order(left, right) {
        if (left.threshold > right.threshold) {
            return -1;
        }
        if (left.threshold < right.threshold) {
            return 1;
        }
        return 0;
    }

    (function() {
        // Sort the burstable thresholds in descending order
        var i;
        for (i in settings.burstable_cdns) {
            if (settings.burstable_cdns.hasOwnProperty(i)) {
                settings.burstable_cdns[i].gb.sort(sort_thresholds_in_descending_order);
            }
        }
    }());
    //console.log(JSON.stringify(settings.burstable_cdns));

    this.get_random = function() {
        return Math.random();
    };

    this.get_random_int = function(min, max) {
        return Math.floor(this.get_random() * (max - min)) + min;
    };

    this.select_random_provider = function() {
        return settings.providers[this.get_random_int(0, settings.providers.length - 1)];
    };

    /** @param {OpenmixConfiguration} config */
    this.do_init = function(config) {
        var i;
        for (i = 0; i < settings.providers.length; i += 1) {
            config.requireProvider(settings.providers[i].alias);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {

        var data = {},
            padded_rtt,
            decision_provider,
            decision_ttl = settings.default_ttl,
            decision_reasons = [];

        function flatten(obj, property) {
            var result = {}, i;
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (obj[i].hasOwnProperty(property) && obj[i][property]) {
                        result[i] = obj[i][property];
                    }
                }
            }
            return result;
        }

        function provider_from_alias(alias) {
            var i;
            for (i = 0; i < settings.providers.length; i += 1) {
                if (alias === settings.providers[i].alias) {
                    return settings.providers[i];
                }
            }
            return null;
        }

        function parse_fusion_data(source) {
            var result = {}, i;
            for (i in source) {
                if (source.hasOwnProperty(i)) {
                    try {
                        result[i] = JSON.parse(source[i]);
                    } catch (ignore) {
                        // Swallow the exception
                    }
                }
            }
            return result;
        }

        function filter_invalid_rtt_scores(data) {
            var result = {}, i;
            for (i in data) {
                if (data.hasOwnProperty(i)) {
                    if (settings.min_valid_rtt_score <= data[i]) {
                        result[i] = data[i];
                    }
                }
            }
            return result;
        }

        function add_rtt_padding(data) {
            var result = {}, i, j, usage_value, current, padding_pct, padding, hit_threshold, provider, base_padding;
            for (i in data.rtt) {
                base_padding = 0;
                if (data.rtt.hasOwnProperty(i)) {
                    if (settings.burstable_cdns[i]) {
                        //console.log(data.fusion[i]);
                        //console.log(data.rtt[i]);
                        provider = provider_from_alias(i);
                        if (undefined !==  provider.base_padding) {
                            base_padding = provider.base_padding;
                        }

                        if (data.fusion[i] && data.fusion[i].usage && data.fusion[i].usage.value && settings.burstable_cdns[i].gb) {
                            usage_value = parseFloat(data.fusion[i].usage.value);

                            hit_threshold = false;
                            for (j = 0; !hit_threshold && (j < settings.burstable_cdns[i].gb.length); j += 1) {
                                current = settings.burstable_cdns[i].gb[j];
                                if (usage_value >= current.threshold) {
                                    hit_threshold = true;
                                    break;
                                }
                            }

                            if (hit_threshold) {
                                //console.log('hit threshold: ' + JSON.stringify(current));
                                padding_pct = (usage_value / current.threshold - 1) * current.multiplier * 100;
                                //console.log('padding_pct: ' + padding_pct);
                                padding = 1 + padding_pct / 100;
                                //console.log('padding: ' + padding);
                                result[i] = base_padding + padding * data.rtt[i];
                            } else {
                                result[i] = base_padding + data.rtt[i];
                            }
                        } else {
                            // No padding, but note the reason
                            result[i] = base_padding + data.rtt[i];
                            if (-1 === decision_reasons.indexOf(reasons.missing_usage_data)) {
                                decision_reasons.push(reasons.missing_usage_data);
                            }
                        }
                    } else {
                        // Not concerned about bursting for this provider
                        result[i] = base_padding + data.rtt[i];
                    }
                }
            }
            return result;
        }

        function as_tuples(obj) {
            var i, result = [];
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    result.push([i, obj[i]]);
                }
            }
            return result;
        }

        // Application logic here
        data.avail = flatten(request.getProbe('avail'), 'avail');
        data.rtt = filter_invalid_rtt_scores(flatten(request.getProbe('http_rtt'), 'http_rtt'));
        data.fusion = parse_fusion_data(request.getData('fusion'));
        //console.log(JSON.stringify(data));

        if ((Object.keys(data.rtt).length !== settings.providers.length) || (Object.keys(data.avail).length !== settings.providers.length)) {
            decision_provider = this.select_random_provider();
            decision_reasons.push(reasons.radar_data_sparse);
            decision_ttl = settings.error_ttl;
        } else if (Object.keys(data.fusion).length !== Object.keys(settings.burstable_cdns).length) {
            decision_provider = this.select_random_provider();
            decision_reasons.push(reasons.missing_fusion_data);
            decision_ttl = settings.error_ttl;
        } else {
            data.rtt = (function() {
                var result = {}, i;
                for (i in data.rtt) {
                    if (data.rtt.hasOwnProperty(i) && data.avail[i]) {
                        if (data.avail[i] >= settings.availability_threshold) {
                            result[i] = data.rtt[i];
                        }
                    }
                }
                return result;
            }());
            padded_rtt = as_tuples(add_rtt_padding(data));
            //console.log('rtt (padded, as tuples): ' + JSON.stringify(padded_rtt));
            padded_rtt.sort(function(left, right) {
                if (left[1] < right[1]) {
                    return -1;
                }
                if (left[1] > right[1]) {
                    return 1;
                }
                return 0;
            });
            //console.log('rtt (sorted): ' + JSON.stringify(padded_rtt));
            decision_provider = provider_from_alias(padded_rtt[0][0]);
            decision_reasons.push(reasons.best_performing);
        }

        response.respond(decision_provider.alias, decision_provider.cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };

}

handler = new OpenmixApplication({
    providers: [
        {
            alias: 'foo',
            cname: 'www.foo.com',
            base_padding: 0
        },
        {
            alias: 'bar',
            cname: 'www.bar.com',
            base_padding: 0
        },
        {
            alias: 'baz',
            cname: 'www.baz.com'
        }
    ],
    burstable_cdns: {
        'foo': {
            gb: [
                { threshold: 20000, multiplier: 1.2 },
                { threshold: 25000, multiplier: 1.3 },
                { threshold: 30000, multiplier: 1.5 }
            ]
        },
        'bar': {
            gb: [
                { threshold: 20000, multiplier: 1.2 },
                { threshold: 25000, multiplier: 1.3 },
                { threshold: 30000, multiplier: 1.5 }
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
