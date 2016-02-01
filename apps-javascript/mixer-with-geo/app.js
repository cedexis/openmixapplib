var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced (all the providers that can be used)
    // keys are the Openmix aliases set in the Portal
    providers: {
        'foo': {
            cname: 'cn.foo.net'
        },
        'bar': {
            cname: 'cn.bar.net'
        },
        'baz': {
            cname: 'cn.baz.net'
        }
    },
    geo_order: ['state', 'region', 'country', 'market'],
    use_radar_availability_threshold: true,
    use_sonar_availability_threshold: true,
    // Geo_settings is used to have different providers and configuration options according to the geo and geo type identified.
    // Any values defined here objects will override the higher level settings.
    // Hierarchy is Global > Market > Country > Region > State.
    // All settings are overridable, including providers, paddings, cnames, ttl, threshold, mix, etc.
    geo_settings: {
        'CN': { //Example of China Settings.
            type: 'country', // Can be 'market', 'country', 'region', 'state'.
            providers: {
                'foo': {
                    cname: 'cn.foo.net',
                    kbps_padding: 5,
                    rtt_padding: 10
                },
                'baz': {
                    cname: 'cn.baz.net',
                    kbps_padding: 5,
                    rtt_padding: 10
                }
            },
            default_ttl: 240,
            radar_availability_threshold: 90,
            rtt_tp_mix: 0.60
        },
        'US-S-AR': { // Example of Arizona Settings.
            type: 'state',
            providers: {
                'foo': {
                    cname: 'az.foo.net',
                    kbps_padding: 5,
                    rtt_padding: 10
                },
                'baz': {
                    cname: 'az.baz.net',
                    kbps_padding: 5,
                    rtt_padding: 10
                }
            },
            default_ttl: 20,
            radar_availability_threshold: 80,
            rtt_tp_mix: 0.05
        }
    },
    // default_settings is used to have providers and configuration options for all geos that aren't defined in geo_settings map.
    default_settings: {
        providers: {
            'foo': {
                cname: 'cn.foo.net',
                kbps_padding: 0,
                rtt_padding: 0
            },
            'bar': {
                cname: 'cn.bar.net',
                // kbps_padding - per normal, this penalizes by 10% in this example. Provider's http_kbps score of 1000kbps would be handled as if it were 900kbps.
                kbps_padding: 0,
                // rtt_padding - per normal, this penalizes by 15% in this example.  Provider's http_rtt score of 100ms would be handled as if it were 115ms.
                rtt_padding: 0
            }
        },
        default_ttl: 240,
        radar_availability_threshold: 95,
        sonar_availability_threshold: 2,
        min_rtt: 5,
        rtt_tp_mix: 0.95
    },
    // A mapping of ASN codes to ONE provider alias:  asn_overrides: { 123: 'baz', 124: 'bar' },
    // The providers here should exists in the settings.providers
    asn_overrides: {}
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
        var i = aliases.length,
            alias;

        while (i --) {
            alias = aliases[i];

            config.requireProvider(alias);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataAvail = request.getProbe('avail'),
            dataRtt = request.getProbe('http_rtt'),
            dataKbps = request.getProbe('http_kbps'),
            /** @type { !Object.<string, { health_score: { value:string }, availability_override:string}> } */
            dataFusion = parseFusionData(request.getData('fusion')),
            candidates,
            candidateAliases,
            allReasons,
            decisionProvider,
            decisionReasons = [],
            decisionTtl = settings.default_settings.default_ttl,
            radarAvailabilityThreshold,
            sonarAvailabilityThreshold,
            minRtt,
            rttTpMix,
            asn = request.asn,
            totalRtt = 0,
            totalKbps = 0,
            selectedCandidates,
            cname;

        allReasons = {
            optimum_server_chosen: 'A',
            geo_override_on_state: 'B',
            geo_override_on_region: 'C',
            geo_override_on_country: 'D',
            geo_override_on_market: 'E',
            asn_override: 'F',
            all_providers_eliminated_radar: 'G',
            all_providers_eliminated_sonar: 'H',
            geo_default: 'I',
            only_one_provider_avail: 'J',
            data_problem: 'K',
            sonar_data_problem: 'L'
        };

        function calculateScore(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                key,
                rttW,
                tpW;

            while (i --) {
                key = keys[i];
                // Normalized
                candidates[key].http_rtt = candidates[key].http_rtt / (totalRtt / candidates[key].http_rtt);
                candidates[key].http_kbps = candidates[key].http_kbps / (totalKbps / candidates[key].http_kbps);

                // Adding weighted values for RTT and TP
                rttW = (rttTpMix-1) * candidates[key].http_rtt;
                tpW = rttTpMix * candidates[key].http_kbps;
                candidates[key].score = rttW + tpW;
            }
            return candidates;
        }

        /**
         * This also update the totalRtt and totalKbps value
         * @param {!Object.<string,{ http_rtt: number, http_kbps: number }>} candidates
         */
        function addPadding(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                key,
                rtt_padding,
                kbps_padding;

            while (i --) {
                key = keys[i];
                rtt_padding = candidates[key].rtt_padding || 0;
                kbps_padding = candidates[key].kbps_padding || 0;
                candidates[key].http_rtt *= 1 + rtt_padding / 100;
                candidates[key].http_kbps *= 1 - kbps_padding / 100;

                // Update the totals
                totalRtt += candidates[key].http_rtt;
                totalKbps += candidates[key].http_kbps;
            }
            return candidates;
        }

        /**
         * @param {Object} candidate
         */
        function filterInvalidRttScores(candidate) {
            return candidate.http_rtt >= minRtt;
        }

        /**
         * @param candidate
         * @param alias
         * @returns {boolean}
         */
        function filterRadarAvailability(candidate, alias) {
            return dataAvail[alias] !== undefined && dataAvail[alias].avail >= radarAvailabilityThreshold;
        }

        /**
         * @param candidate
         * @param alias
         * @returns {boolean}
         */
        function filterSonarAvailability(candidate, alias) {
            return dataFusion[alias] !== undefined && dataFusion[alias].health_score !== undefined
                && dataFusion[alias].health_score.value > sonarAvailabilityThreshold;
        }

        // Override the settings if geo mapping is defined, if not use the default geo settings
        function overrideSettingByGeo() {
            var geotype, geo, i,
                candidates;

            for (i = 0; i < settings.geo_order.length; i ++) {
                geotype = settings.geo_order[i];
                geo = request[geotype];

                if (settings.geo_settings[geo] !== undefined && settings.geo_settings[geo].type === geotype) {
                    // Override the settings by the Geo or the default if it isn't defined
                    candidates = settings.geo_settings[geo].providers || settings.default_settings.providers;
                    decisionTtl = settings.geo_settings[geo].default_ttl || settings.default_settings.default_ttl;
                    radarAvailabilityThreshold = settings.geo_settings[geo].radar_availability_threshold || settings.default_settings.radar_availability_threshold;
                    sonarAvailabilityThreshold = settings.geo_settings[geo].sonar_availability_threshold || settings.default_settings.sonar_availability_threshold;
                    minRtt = settings.geo_settings[geo].min_rtt || settings.default_settings.min_rtt;
                    rttTpMix = settings.geo_settings[geo].rtt_tp_mix || settings.default_settings.rtt_tp_mix;

                    decisionReasons.push(allReasons['geo_override_on_' + geotype]);
                    return candidates;
                }
            }

            // Use default geo
            candidates = settings.default_settings.providers;
            decisionTtl = settings.default_settings.default_ttl;
            radarAvailabilityThreshold = settings.default_settings.radar_availability_threshold;
            sonarAvailabilityThreshold = settings.default_settings.sonar_availability_threshold;
            minRtt = settings.default_settings.min_rtt;
            rttTpMix = settings.default_settings.rtt_tp_mix;

            decisionReasons.push(allReasons.geo_default);
            return candidates;
        }

        // ASN override
        if (settings.asn_overrides[asn] !== undefined) {
            decisionProvider = settings.asn_overrides[asn];
            decisionReasons.push(allReasons.asn_override);
        } else {
            // Provider eligibility check - filtering per Global_Settings or Geo_Settings
            candidates = overrideSettingByGeo();
            selectedCandidates = cloneObject(candidates);
            candidateAliases = Object.keys(selectedCandidates);

            if (((settings.use_sonar_availability_threshold === true && Object.keys(dataFusion).length > 0) || settings.use_sonar_availability_threshold === false)
                && ((settings.use_radar_availability_threshold === true && Object.keys(dataAvail).length > 0) || settings.use_radar_availability_threshold === false)
                && Object.keys(dataRtt).length > 0) {

                if (settings.use_radar_availability_threshold) {
                    candidates = filterObject(candidates, filterRadarAvailability);
                    candidateAliases = Object.keys(candidates);
                    if (candidateAliases.length === 0) {
                        decisionReasons.push(allReasons.all_providers_eliminated_radar);
                    }
                }

                if (candidateAliases.length > 0 && settings.use_sonar_availability_threshold) {
                    if (dataFusion[Object.keys(dataFusion)[0]].availability_override === undefined) {
                        candidates = filterObject(candidates, filterSonarAvailability);
                        candidateAliases = Object.keys(candidates);
                        if (candidateAliases.length === 0) {
                            decisionReasons.push(allReasons.all_providers_eliminated_sonar);
                        }
                    } else {
                        decisionReasons.push(allReasons.sonar_data_problem);
                    }
                }

                if (candidateAliases.length === 0) {
                    // Join the avail scores with the list of viable candidates
                    candidates = intersectObjects(cloneObject(selectedCandidates), dataAvail, 'avail');
                    candidateAliases = Object.keys(candidates);
                    if (candidateAliases.length > 0) {
                        decisionProvider = getHighest(candidates, 'avail');
                    }
                } else if (candidateAliases.length === 1) {
                    decisionProvider = candidateAliases[0];
                    decisionReasons.push(allReasons.only_one_provider_avail);
                } else {
                    // Join the rtt scores with the list of viable candidates
                    candidates = intersectObjects(candidates, dataRtt, 'http_rtt');

                    if (rttTpMix !== 1) {
                        candidates = filterObject(candidates, filterInvalidRttScores);
                    }

                    // Join the kbps scores with the list of viable candidates
                    candidates = intersectObjects(candidates, dataKbps, 'http_kbps');

                    candidateAliases = Object.keys(candidates);
                    if (candidateAliases.length > 0) {

                        // Add kbps and rtt padding
                        candidates = addPadding(candidates);

                        // mean-normalized RTT and TP and calculate scores
                        candidates = calculateScore(candidates);

                        decisionProvider = getHighest(candidates, 'score');
                        decisionReasons.push(allReasons.optimum_server_chosen);
                    }
                }
            }

            if (decisionProvider === undefined) {
                candidateAliases = Object.keys(settings.default_settings.providers);
                decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
                decisionReasons.push(allReasons.data_problem);
            }
        }

        cname = selectedCandidates
            && selectedCandidates[decisionProvider]
            && selectedCandidates[decisionProvider].cname
            ? selectedCandidates[decisionProvider].cname
            : settings.providers[decisionProvider].cname;

        response.respond(decisionProvider, cname);
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
     * @param {!Object} object
     */
    function cloneObject(object) {
        var keys = Object.keys(object),
            i = keys.length,
            data = {},
            key;
        while (i --) {
            key = keys[i];
            data[key] = object[key];
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
     * @param {!Object} data
     */
    function parseFusionData(data) {
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