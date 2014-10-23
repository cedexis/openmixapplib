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
    // A mapping of ISO 3166-1 country codes to provider aliases
    country_to_provider: {},
    // A mapping of market codes to provider aliases
    market_to_provider: {},
    // A mapping of ASN codes to provider aliases:  asn_to_provider: { 123: 'baz', 124: 'bar' }
    asn_to_provider: {},
    throughput_tie_threshold: 0.95,
    min_valid_rtt_score: 5,
    // Set to `true` to enable the asn override feature
    asn_override: false,
    // Set to `true` to enable the geo override feature
    geo_override: false,
    default_ttl: 20,
    error_ttl: 20
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
        missing_avail: 'D2',
        geo_override_on_country: 'E',
        geo_override_not_available_country: 'F',
        asn_override: 'G',
        asn_override_not_available: 'H',
        geo_override_on_market: 'I',
        geo_override_not_available_market: 'J'
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
            /** @type {Object.<string,{http_kbps:number}>} */
            data_kbps,
            /** @type {Object.<string,{http_rtt:number}>} */
            data_rtt,
            decision_provider,
            decision_reasons = [],
            decision_ttl = settings.default_ttl,
            candidates,
            decision_provider_override = '';

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
            //console.log('random', Math.random());
            decision_provider = aliases[Math.floor(Math.random() * aliases.length)];
            decision_reasons.push(reason);
            decision_ttl = settings.error_ttl;
        }

        function select_geo_override(providers, region, reason, error_reason) {
            if (typeof providers[region] !== 'undefined') {
                if (typeof data_avail[providers[region]] !== 'undefined') {
                    decision_provider_override = providers[region];
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reasons.push(reason);
                } else {
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(error_reason);
                }
            }
        }

        function select_asn_override(providers, asn, reason, error_reason) {
            if (typeof providers[asn] !== 'undefined') {
                if (typeof data_avail[providers[asn]] !== 'undefined') {
                    decision_provider_override = providers[asn];
                    decision_ttl = decision_ttl || settings.default_ttl;
                    decision_reasons.push(reason);
                } else {
                    decision_ttl = decision_ttl || settings.error_ttl;
                    decision_reasons.push(error_reason);
                }
            }
        }

        data_avail = request.getProbe('avail');
        decision_provider = get_highest(data_avail, 'avail');
        filter_object(data_avail, filter_availability);
        candidates = Object.keys(data_avail);
        //console.log('Available candidates: ' + JSON.stringify(candidates));

        if (settings.geo_override) {
            select_geo_override(settings.country_to_provider, request.country, reasons.geo_override_on_country, reasons.geo_override_not_available_country);

            if (decision_provider_override === '') {
                select_geo_override(settings.market_to_provider, request.market, reasons.geo_override_on_market, reasons.geo_override_not_available_market);
            }
        }

        if (settings.asn_override) {
            select_asn_override(settings.asn_to_provider, request.asn, reasons.asn_override, reasons.asn_override_not_available);
        }

        if (decision_provider_override === '') {
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
        } else {
            decision_provider = decision_provider_override;
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
     * @param {{avail:number}} candidate
     */
    function filter_availability(candidate) {
        return candidate.avail >= settings.availability_threshold;
    }

    /**
     * @param {!Object} candidate
     */
    function filter_empty(candidate) {
        return !is_empty(candidate);
    }

    /**
     * @param {!Object} object
     * jshint unused:false
     */
    function is_empty(object) {
        var key;
        for (key in object) {
            return false;
        }
        return true;
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
     * @param {!Object} source
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
}
