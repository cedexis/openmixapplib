var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: {
        'foo': {
            cname: 'www.foo.com',
            padding:0
        },
        'bar': {
            cname: 'www.bar.com',
            padding:10
        },
        'baz': {
            cname: 'www.baz.com',
            padding:0
        }
    },
    // Selected if a provider can't be determined
    default_provider: 'foo',

    // If you want to restrict stickiness to certain countries, list their ISO 3166-1 alpha-2
// codes in this array (see http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
    sticky_countries: [],
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 30,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20,
    availability_threshold: 60,
    variance_threshold: 0.65,

    /**
     * @type {number}
     */
    maxSavedProviders: 800
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

    /**
     * @type (Object) An object storing the last provider selected for a
     * particular market/country/asn combination.  The object is keyed by
     * "<market>-<country>-<asn>".
     */
    this.saved = {};

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
        var avail = request.getProbe('avail'),
            rtt = request.getProbe('http_rtt'),
            allReasons,
            decisionProvider,
            decisionReason,
            /**
             * An object containing the list of candidate providers, keyed by
             * provider alias.  It is composed by joining the Radar availability
             * and HTTP RTT data taken from the Openmix API.  It is also run
             * through a filter to remove unavailable providers.
             *
             * Example after composition:
             *
             * {
             *     "foo": {
             *         "avail": 99,
             *         "http_rtt": 201
             *     }
             *     "bar": {
             *         "avail": 100,
             *         "http_rtt": 198
             *     }
             * }
             *
             * @type (Object.<string,{http_rtt:number,avail:number}>)
             */
            candidates,
            candidateAliases,
            stickyKey = request.market + "-" + request.country + "-" + request.asn,
            previous,
            refValue;

        allReasons = {
            best_performing_provider_equal_previous: 'A',
            no_previous: 'B',
            previous_below_availability_threshold: 'C',
            new_provider_below_varianceThreshold: 'D',
            choosing_previous_best_perform_within_varianceThreshold: 'E',
            all_providers_eliminated: 'F',
            unexpected_previous_alias: 'G'
        };

        function filterCandidates(candidate) {
            return (typeof candidate.avail !== 'undefined' && candidate.avail >= settings.availability_threshold);
        }

        //update_sticky_data

        var filtered = settings.sticky_countries[request.country];
        if (typeof filtered !== 'undefined' || settings.sticky_countries.length === 0) {
            if (typeof this.saved[stickyKey] === 'undefined') {
                while (settings.maxSavedProviders <= Object.keys(this.saved).length) {
                    delete this.saved[getLRUIndex(this.saved)];
                }
                this.saved[stickyKey] = {'provider': null}; // saves the stickyKey with a provider null
            }
            this.saved[stickyKey].timestamp = new Date().getTime();
        }

        previous = null;

        if (typeof this.saved[stickyKey] !== 'undefined') {
            previous = this.saved[stickyKey].provider;
        }

        if(previous !== null && typeof settings.providers[previous] === 'undefined'){
            decisionProvider =  aliases[Math.floor(Math.random() * aliases.length)];
            decisionReason = allReasons.unexpected_previous_alias;
        }
        else {

            candidates = filterObject(avail, filterCandidates);

            // Join the rtt scores with the list of viable candidates
            candidates = joinObjects(candidates, rtt, 'http_rtt');

            candidateAliases = Object.keys(candidates);


            if (candidateAliases.length !== 0) {
                addRttPadding(candidates);
                if (typeof avail[previous] !== 'undefined') {
                    refValue = settings.variance_threshold * avail[previous].http_rtt;
                }
                var bestRtt = getLowest(candidates, 'http_rtt');
                decisionProvider = bestRtt;

                if (bestRtt === previous) {
                    decisionReason = allReasons.best_performing_provider_equal_previous;
                } else if (typeof refValue === 'undefined' || typeof previous === 'undefined') {
                    decisionReason = allReasons.no_previous;
                    this.saved[stickyKey].provider = decisionProvider;
                } else if (avail[previous].avail < settings.availability_threshold) {
                    decisionReason = allReasons.previous_below_availability_threshold;
                    this.saved[stickyKey].provider = decisionProvider;
                } else if (candidates[decisionProvider].http_rtt < refValue) {
                    this.saved[stickyKey].provider = decisionProvider;
                    decisionReason = allReasons.new_provider_below_varianceThreshold;
                } else {
                    decisionProvider = previous;
                    decisionReason = allReasons.choosing_previous_best_perform_within_varianceThreshold;
                }
            }
            else {
                decisionProvider = getHighest(avail);
                this.saved[stickyKey].provider = decisionProvider;
                decisionReason = allReasons.all_providers_eliminated;
            }
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
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
     * @param {!Object} source
     */
    function getLRUIndex(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            min = Infinity,
            value;
        while (i --) {
            key = keys[i];
            value = source[key].timestamp;
            if (value < min) {
                candidate = key;
                min = value;
            }
        }
        return candidate;
    }

    function getHighest(source) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;

        while (i --) {
            key = keys[i];
            value = source[key].avail;

            if (value > max) {
                candidate = key;
                max = value;
            }
        }

        return candidate;
    }

    function addRttPadding(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;

        while (i --) {
            key = keys[i];
            data[key].http_rtt += settings.providers[key].padding;
        }
        return data;
    }

}
