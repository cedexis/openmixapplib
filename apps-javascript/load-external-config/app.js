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

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = filterObject(request.getProbe('avail'), filterEmpty),
            dataRtt = filterObject(request.getProbe('http_rtt'), filterInvalidRttScores),
            dataFusionRaw = request.getData('fusion'),
            dataFusion = parseFusionData(dataFusionRaw[settings.fusion_provider]),
            hostname = request.hostname_prefix,
            decisionProvider,
            decisionTtl = settings.default_ttl,
            decisionReasons = [],
            candidates,
            cnameOverride,
            allReasons;
        
        allReasons = {
            best_performing: 'A',
            all_providers_eliminated: 'B',
            missing_fusion_data: 'C',
            radar_data_sparse: 'D'
        };

        function addRttPadding(data) {
            var aliases = Object.keys(data),
                i = aliases.length,
                alias,
                provider,
                basePadding;
            while (i --) {
                alias = aliases[i];
                provider = settings.providers[alias];
                basePadding = provider.base_padding === undefined ? 0 : provider.base_padding;
                if (data[alias] !== undefined) {
                    data[alias].http_rtt = basePadding + data[alias].http_rtt;    
                }
            }
            return data;
        }

        function selectRandomProvider(reason) {
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionReasons.push(reason);
            decisionTtl = settings.error_ttl;
        }

        if (Object.keys(dataRtt).length !== aliases.length || Object.keys(dataAvail).length !== aliases.length) {
            selectRandomProvider(allReasons.radar_data_sparse);
        }
        else {
            dataAvail = filterObject(dataAvail, filterAvailability);
            candidates = Object.keys(dataAvail);
            if (candidates.length === 0) {
                selectRandomProvider(allReasons.all_providers_eliminated);
            }
            else if (candidates.length === 1) {
                decisionProvider = candidates[0];
                decisionReasons.push(allReasons.best_performing);
            }
            else {
                dataRtt = addRttPadding(intersectObjects(dataRtt, dataAvail, 'avail'));
                decisionProvider = getLowest(dataRtt, 'http_rtt');
                decisionReasons.push(allReasons.best_performing);
            }
        }

        if (dataFusion[hostname] !== undefined && dataFusion[hostname][decisionProvider] !== undefined) {
            cnameOverride = dataFusion[hostname][decisionProvider];
        } else {
            decisionReasons.push(allReasons.missing_fusion_data);
        }

        response.respond(decisionProvider, cnameOverride || settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReasons.join(','));

    };

    /**
     * @param {!Object} object
     * @param {Function} filter
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
     * @param {{avail:number}} candidate
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
     * @param {string} data
     */
    function parseFusionData(data) {
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
