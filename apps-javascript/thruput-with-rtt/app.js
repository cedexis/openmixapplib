var handler = new OpenmixApplication({
    providers: {
        'cdn1': {
            cname: 'cdn1.com'
        },
        'cdn2': {
            cname: 'cdn2.com'
        },
        'origin': {
            cname: 'origin.example.com'
        }
    },
    availability_threshold: 90,
    throughput_tie_threshold: 0.95,
    min_valid_rtt_score: 5,
    default_ttl: 20
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
        best_throughput: 'A1',
        sparse_throughput_data: 'A2',
        best_rtt_with_throughput: 'B1',
        best_rtt: 'B2',
        missing_data: 'C1',
        best_avail: 'D1',
        missing_avail: 'D2'
    };

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }
    };

    this.handle_request = function(request, response) {
        var data_avail,
            data_kbps,
            data_rtt,
            decision_provider,
            decision_reasons = [],
            decision_ttl = settings.default_ttl,
            candidates;

        function get_kbps_filter(data) {
            var aliases = Object.keys(data),
                i = aliases.length,
                alias,
                kbps_threshold = -Infinity;

            while (i --) {
                alias = candidates[i];

                if (data_kbps[alias].http_kbps > kbps_threshold) {
                    kbps_threshold = data_kbps[alias].http_kbps;
                }
            }

            kbps_threshold *= settings.throughput_tie_threshold;

            return function(candidate) {
                return candidate.http_kbps >= kbps_threshold;
            };
        }

        function select_random_provider(reason) {
            console.log('random', Math.random());
            decision_provider = aliases[Math.floor(Math.random() * aliases.length)];
            decision_reasons.push(reason);
            decision_ttl = settings.error_ttl;
        }

        data_avail = request.getProbe('avail');
        decision_provider = get_highest(data_avail, 'avail');
        filter_object(data_avail, filter_availability);
        candidates = Object.keys(data_avail);
        //console.log('Available candidates: ' + JSON.stringify(candidates));

        if (candidates.length === 0) {
            if (typeof decision_provider === 'undefined') {
                select_random_provider(reasons.missing_avail);
            }
            else {
                decision_reasons.push(reasons.best_avail);
            }
        }
        else if (candidates.length === 1) {
            decision_provider = candidates[0];
            decision_reasons.push(reasons.best_avail);
        }
        else {
            data_kbps = join_objects(filter_object(request.getProbe('http_kbps'), filter_empty), data_avail, 'avail');
            data_rtt = join_objects(filter_object(request.getProbe('http_rtt'), filter_invalid_rtt_scores), data_avail, 'avail');

            if (!is_empty(data_kbps)) {
                candidates = Object.keys(data_kbps);

                if (candidates.length === 1) {
                    decision_provider = candidates[0];
                    decision_reasons.push(reasons.sparse_throughput_data);
                }
                else {
                    filter_object(data_kbps, get_kbps_filter(data_kbps));
                    join_objects(data_rtt, data_kbps, 'http_kbps');
                    candidates = Object.keys(data_rtt);

                    if (candidates.length === 0) {
                        decision_provider = get_highest(data_kbps, 'http_kbps');
                        decision_reasons.push(reasons.best_throughput);
                    }
                    else if (candidates.length === 1) {
                        decision_provider = candidates[0];
                        decision_reasons.push(reasons.best_throughput);
                    }
                    else {
                        decision_provider = get_lowest(data_rtt, 'http_rtt');
                        decision_reasons.push(reasons.best_rtt_with_throughput);
                    }
                }
            }
            else if (!is_empty(data_rtt)) {
                decision_provider = get_lowest(data_rtt, 'http_rtt');
                decision_reasons.push(reasons.best_rtt);
            }
            else {
                select_random_provider(reasons.missing_data);
            }
        }

        response.respond(decision_provider, settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };

    /**
     * @param {Object} object
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
     * @param {Object} candidate
     */
    function filter_availability(candidate) {
        return candidate.avail >= settings.availability_threshold;
    }

    /**
     * @param {Object} candidate
     */
    function filter_empty(candidate) {
        return !is_empty(candidate);
    }

    /**
     * @param {Object} candidate
     */
    function is_empty(object) {
        for (var key in object) {
            return false;
        }
        return true;
    }

    /**
     * @param {Object} source
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
     * @param {Object} source
     * @param {string} property
     */
    function get_highest(source, property) {
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
     * @param {Object} target
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
}