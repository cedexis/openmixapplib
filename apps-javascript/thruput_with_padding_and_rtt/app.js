var handler = new OpenmixApplication({
    //kbps_padding
    //  value from 0 to 100
    //  it decreases the value of 'http_kbps' of each provider with certain percentage.
    //  0 means decrease 0% of the value, 100 means decrease 100% of the value
    //  e.g: if a provider has a 'http_kbps = 1000' and a 'kbps_padding: 20' is configured for that provider.
    //  The http_kbps value will decrease on a 20 percent, giving a value of http_kbps = 800
    providers: {
        'foo': {
            cname: 'www.foo.com',
            kbps_padding: 0
        },
        'bar': {
            cname: 'www.bar.com',
            kbps_padding: 0
        },
        'baz': {
            cname: 'www.baz.com',
            kbps_padding: 0
        }
    },
    // A mapping of ISO 3166-1 country codes to provider aliases
    country_overrides: {},
    // A mapping of market codes to provider aliases
    market_overrides: {},
    // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
    asn_overrides: {},
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // The minimum availability score that providers must have in order to be considered available
    availability_threshold: 90,
    //if the top 2 Throughput providers are within tieThreshold %, use Response time to break the tie
    //tie_theshold
    //  value from 0.01 to 0.99
    //when tie_theshold = 0.95, it will check if the difference between the best 2 providers is greater than 5%, OR,
    //  if tie_theshold = 0.90, it will check if the difference between the best 2 providers is greater than 10%, and so on.
    //if the dif is greater than x%, then the best one will be selected, but if it isn't, there will be a tie and 'lowest RTT' criteria should be used to break it.
    tie_threshold: 0.95
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

        // Register the providers that will be selected from
        while (i --) {
            config.requireProvider(aliases[i]);
        }

    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = request.getProbe('avail'),
            dataKbps = request.getProbe('http_kbps'),
            dataRtt = request.getProbe('http_rtt'),
            country = request.country,
            market = request.market,
            asn = request.asn,
            allReasons,
            decisionProvider = '',
            candidates,
            candidateAliases,
            reasonCode = '',
            first,
            second,
            kbpsCandidates;

        allReasons = {
            best_performing_by_kbps: 'A',
            best_performing_by_rtt: 'B',
            data_problem: 'C',
            all_but_one_eliminated: 'D',
            all_providers_eliminated: 'E',
            found_country: 'F',
            found_market: 'G',
            found_asn: 'H'
        };

        if (country !== undefined && settings.country_overrides[country] !== undefined) {
            decisionProvider = settings.country_overrides[country];
            reasonCode = allReasons.found_country;
        }
        else if (market !== undefined && settings.market_overrides[market] !== undefined) {
            decisionProvider = settings.market_overrides[market];
            reasonCode = allReasons.found_market;
        }
        else if (asn !== undefined && settings.asn_overrides[asn] !== undefined) {
            decisionProvider = settings.asn_overrides[asn];
            reasonCode = allReasons.found_asn;
        }
        else if (Object.keys(dataAvail).length > 0) {
            // Remove unavailable providers
            candidates = filterObject(dataAvail, filterAvailability);
            candidateAliases = Object.keys(candidates);

            // If only one is available
            if (candidateAliases.length === 1) {
                decisionProvider = candidateAliases[0];
                reasonCode = allReasons.all_but_one_eliminated;
            }
            else if (candidateAliases.length === 0) {
                decisionProvider = getHighest(dataAvail,'avail','');
                reasonCode = allReasons.all_providers_eliminated;
            }
            else {
                // Join kbps with available candidates
                kbpsCandidates = intersectObjects(dataKbps, candidates, 'avail');

                if (Object.keys(kbpsCandidates).length > 1) {
                    // Add kbps padding
                    addKbpsPadding(kbpsCandidates);

                    // See if the top 2 are a tie
                    first = getHighest(kbpsCandidates, 'http_kbps', '');
                    second = getHighest(kbpsCandidates, 'http_kbps', first);

                    if (kbpsCandidates[first].http_kbps * settings.tie_threshold < kbpsCandidates[second].http_kbps
                        && dataRtt[first] !== undefined && dataRtt[second] !== undefined
                        && dataRtt[second].http_rtt < dataRtt[first].http_rtt) {
                        // Tied and send fastest by kbps has lower rtt
                        decisionProvider = second;
                        reasonCode = allReasons.best_performing_by_rtt;
                    } else {
                        // Best provider chosen by either kbps or rtt...
                        decisionProvider = first;
                        reasonCode = allReasons.best_performing_by_kbps;
                    }
                }

                // We lack KBPS measurements so choose by RTT
                if ((decisionProvider === '' || decisionProvider === undefined) && Object.keys(dataRtt).length > 0) {
                    // Join rtt with available candidates
                    candidates = intersectObjects(dataRtt, candidates, 'avail');
                    decisionProvider = getLowest(candidates, 'http_rtt');
                    reasonCode = allReasons.best_performing_by_rtt;
                }
            }
        }

        if (decisionProvider === '' || decisionProvider === undefined) {
            // If we get here because of some weird data problem, select randomly
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            reasonCode = allReasons.data_problem;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(reasonCode);
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
     * @param {{avail:number}} candidate
     */
    function filterAvailability(candidate) {
        return candidate.avail >= settings.availability_threshold;
    }

    /**
     * @param {!Object} source
     * @param {string} property
     * @param {string} exclude
     */
    function getHighest(source, property, exclude) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            max = -Infinity,
            value;

        while (i --) {
            key = keys[i];
            if (exclude === '' || key !== exclude) {
                value = source[key][property];

                if (value > max) {
                    candidate = key;
                    max = value;
                }
            }
        }

        return candidate;
    }

    /**
     * @param {!Object.<string,{ http_kbps: number }>} data
     */
    function addKbpsPadding(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];
            data[key].http_kbps *= 1 - settings.providers[key].kbps_padding / 100;
        }
        return data;
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
