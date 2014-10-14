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
    fusion_provider: 'foo',
    availability_threshold: 90,
    min_valid_rtt_score: 5,
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
        best_performing: 'A',
        all_providers_eliminated: 'B',
        missing_fusion_data: 'C',
        radar_data_sparse: 'D'
    };

    var aliases = Object.keys(settings.providers);

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
        var data_avail = filter_object(request.getProbe('avail'), filter_empty),
            data_rtt = filter_object(request.getProbe('http_rtt'), filter_invalid_rtt_scores),
            data_fusion_raw = request.getData('fusion'),
            data_fusion = parse_fusion_data(data_fusion_raw[settings.fusion_provider]),
            hostname = request.hostname_prefix,
            decision_provider,
            decision_ttl = settings.default_ttl,
            decision_reasons = [],
            candidates,
            override_cname;

        function add_rtt_padding(data) {
            var aliases = Object.keys(data),
                i = aliases.length,
                alias,
                provider,
                base_padding;
            while (i --) {
                alias = aliases[i];
                provider = settings.providers[alias];
                base_padding = typeof provider.base_padding === 'undefined' ? 0 : provider.base_padding;
                data[alias].http_rtt = base_padding + data[alias].http_rtt;
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

        if (data_fusion[hostname] && data_fusion[hostname][decision_provider]) {
            override_cname = data_fusion[hostname][decision_provider];
        } else {
            decision_reasons.push(reasons.missing_fusion_data);
        }

        response.respond(decision_provider, override_cname || settings.providers[decision_provider].cname);
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
     * @param {string} data
     */
    function parse_fusion_data(data) {
        var lines = data.split("\n"),
            headers = lines[0].split(","),
            j = headers.length,
            i = lines.length,
            result = {},
            tmp_result,
            c_line;
        while (i --) {
            c_line = lines[i].split(",");
            tmp_result = {};
            while (j --){
                tmp_result[headers[j]] = c_line[j];
            }
            result[c_line[0]] = tmp_result;
            j = headers.length;
        }
        return result;
    }
}
