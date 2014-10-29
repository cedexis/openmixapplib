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
    rtt_variance:0.75
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
    var failoverAliases = typeof settings.failover_providers === 'undefined' ? [] : Object.keys(settings.failover_providers);

    // For use in the hash lookup
    this.target_buckets = [];
    this.sorted_hashes = [];

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }

        i = failoverAliases.length;

        while (i --) {
            config.requireProvider(failoverAliases[i]);
        }

    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataSonar  = filterObject(parseSonarData(request.getData('sonar')), filterSonar),
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
            target = [],
            targetAliases;

        allReasons = {
            best_performing_rtt: 'A',
            hash_routing: 'B',
            data_problem: 'C',
            all_provider_eliminated: 'D',
            default_selected: 'E'
        };

        function filterAvailability(candidate) {
            return (typeof candidate.avail !== 'undefined' && candidate.avail >= settings.availability_threshold);
        }

        function filterSonar(candidate) {
            return (candidate >= settings.sonar_threshold);
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


        // filter candidates by availability
        candidates = filterObject(avail, filterAvailability);

        // Join the sonar scores with the list of viable candidates
        candidates = joinObjects(candidates, dataSonar, 'undefined');

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
                bestScore = getLowest(candidates, 'http_rtt');

                // Calculate which platforms are ties
                target = filterRttVariance(candidates, bestScore);
                targetAliases = Object.keys(target);

                if (targetAliases.length == 1) {
                    //print "Clear winner \n";
                    decisionProvider = targetAliases[0];
                    reasonCode = allReasons.best_performing_rtt;
                    decisionTtl = decisionTtl || settings.default_ttl;
                }
            } else {
                // in the rare case we don't have RTT data
                // choose consistently from among all candidates
                target = candidateAliases;
            }

            if (!decisionProvider) {
                /** There was a tie of at least 2
                 * So we choose using the consistent hashing algorithm
                 * This should ensure we make the same choice each time
                 * for each ASN seen
                 * */

                 /*
                 foreach ($targets as $target)
                 {
                 $this->add_target($target);
                 }

                 //print_r($targets);

                 // Compare the hash of the reqestor key to the hash ring based on the platforms
                 $index = $this->search($request);
                 //print "index: $index\n";

                 //print_r($this->target_buckets);
                 //print "$this->sorted_hashes[$index]\n";
                 //print_r($this->target_buckets[$this->sorted_hashes[$index]]);

                 $response->selectProvider($this->target_buckets[$this->sorted_hashes[$index]]);
                 $response->setReasonCode($this->reasons['Hash routing']);
                 return;
                 */
                decisionProvider = settings.default_provider;
                reasonCode = allReasons.default_selected;
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
}
