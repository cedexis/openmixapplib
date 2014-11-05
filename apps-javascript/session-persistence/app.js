var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: {
        'foo': {
            cname: 'www.foo.com'
        },
        'bar': {
            cname: 'www.bar.com'
        }
    },
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    sonar_threshold: 95,
    availability_threshold: 85,
    rtt_variance:0.75,
    identifier: 0,
    replicas: 20
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

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);

    // For use in the hash lookup
    this.targetBuckets = [];
    this.sortedHashes = [];
    this.identifier = 0;

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
        var dataSonar  = parseSonarData(request.getData('sonar')),
            avail = request.getProbe('avail'),
            dataRtt = request.getProbe('http_rtt'),
            allReasons,
            decisionProvider,
            decisionTtl,
            candidates,
            candidateAliases,
            reasonCode,
            decisionCname,
            bestScore,
            targets = [],
            targetAliases,
            index;

        allReasons = {
            best_performing_rtt: 'A',
            hash_routing: 'B',
            data_problem: 'C',
            all_provider_eliminated: 'D',
            default_selected: 'E'
        };

        function filterAvailability(candidate, alias) {
            return (typeof candidate.avail !== 'undefined'
                && candidate.avail >= settings.availability_threshold
                && typeof dataSonar[alias] !== 'undefined' && dataSonar[alias] >= settings.sonar_threshold);
        }

        function filterRttVariance(candidates, bestScore) {
            var keys = Object.keys(candidates),
                i = Object.keys(candidates).length,
                key,
                data = [];

            while (i --) {
                key = keys[i];

                if (candidates[key].http_rtt * settings.rtt_variance < bestScore) {
                    data[key] = (candidates[key]);
                }
            }

            return data;
        }

        function search(key, sortedHashes) {
            var hash = fnv(key),
                left = 0,
                right = sortedHashes.length - 1,
                mid;

            while (left < right) {
                mid = (right + left) >> 1;
                if (sortedHashes[mid] < hash) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            return left;
        }

        function updateSortedHashes(targetBuckets) {
            var keys = Object.keys(targetBuckets);
            return keys.sort();
        }

        function addTargets(targets, targetBuckets) {
            var i = settings.replicas,
                j = Object.keys(targets).length,
                target,
                keys = Object.keys(targets);
            while (j --) {
                target = targets[keys[j]];
                while (i --) {
                    targetBuckets[fnv(target + settings.identifier + i)] = target;
                }
            }
        }


        // filter candidates by availability
        candidates = filterObject(avail, filterAvailability);

        candidateAliases = Object.keys(candidates);

        //If none or just one are available, choose the least bad
        if (candidateAliases.length <= 1) {
            decisionProvider = getHighest(avail, 'avail');
            reasonCode = allReasons.all_provider_eliminated;
            decisionTtl = decisionTtl || settings.default_ttl;
        }

        if (!decisionProvider) {
            candidates = joinObjects(candidates, dataRtt, 'http_rtt');
            if (Object.keys(candidates).length > 0) {
                // Get the score of the fastest
                bestScore = candidates[getLowest(candidates, 'http_rtt')].http_rtt;

                // Calculate which platforms are ties
                targets = filterRttVariance(candidates, bestScore);
                targetAliases = Object.keys(targets);

                if (targetAliases.length == 1) {
                    //print "Clear winner \n";
                    decisionProvider = targetAliases[0];
                    reasonCode = allReasons.best_performing_rtt;
                    decisionTtl = decisionTtl || settings.default_ttl;
                }
            } else {
                // in the rare case we don't have RTT data
                // choose consistently from among all candidates
                targets = candidateAliases;
            }

            if (!decisionProvider) {
                /** There was a tie of at least 2
                 * So we choose using the consistent hashing algorithm
                 * This should ensure we make the same choice each time
                 * for each ASN seen
                 * */

                addTargets(targets, this.targetBuckets);
                this.sortedHashes = updateSortedHashes(this.targetBuckets);

                // Compare the hash of the reqestor key to the hash ring based on the platforms
                index = search(request.asn, this.sortedHashes);

                decisionProvider = this.targetBuckets[this.sortedHashes[index]];
                reasonCode = allReasons.hash_routing;
                decisionTtl = decisionTtl || settings.default_ttl;
            }

        }

        if (!decisionProvider) {
            decisionProvider = settings.default_provider;
            reasonCode = allReasons.default_selected;
            decisionTtl = decisionTtl || settings.default_ttl;
        }

        response.respond(decisionProvider, decisionCname || settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(reasonCode);
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            data = [];

        while (i --) {
            key = keys[i];

            if (filter(object[key], key)) {
                data[key] = (object[key]);
            }
        }

        return data;
    }

    /**
     * @param {!Object} target
     * @param {Object} source
     * @param {string} property
     */
    function joinObjects(target, source, property) {
        var keys = Object.keys(target),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];

            if (typeof property !== 'undefined') {
                if (typeof source[key] !== 'undefined' && typeof source[key][property] !== 'undefined') {
                    target[key][property] = source[key][property];
                }
                else {
                    delete target[key];
                }
            } else {
                if (typeof source[key] !== 'undefined') {
                    target[key][property] = source[key][property];
                }
                else {
                    delete target[key];
                }
            }
        }

        return target;
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
     * @param {!Object} source
     * @param {string} property
     */
    function getHighest(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = 0,
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

    function fnv(str) {
        var hash = 0x811C9DC5,
            i,
            len;

        str = '' + str;

        for (i = 0, len = str.length; i < len; i ++) {
            hash = hash ^ str.charCodeAt(i);
            hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1);
        }

        return hash & 0xffffffff;
    }
}
