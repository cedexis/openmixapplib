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
    geo_order: ['asn', 'state', 'region', 'country', 'market'],
    use_radar_availability_threshold: true,
    use_sonar_availability_threshold: true,
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
    // Geo_settings is used to have different providers and configuration options according to the geo and geo type identified.
    // Any values defined here objects will override the higher level settings.
    // Hierarchy is Global > Market > Country > Region > State > Asn.
    // All settings are overridable, including providers, paddings, cnames, ttl, threshold, mix, etc.
    //you can also define a 'fallbackBehavior' settings per each geo config to use in case geo config is not avail
    // if you want to define e.g. a new country settings just put the config inside geo_settings -> country
    /*Example of potential geo settings (in this case, country settings).
     'CN': {
         providers: {
             'foo': {
                 cname: 'cn.foo.net',
                 kbps_padding: 0,
                 rtt_padding: 0
             },
             'baz': {
                 cname: 'cn.baz.net',
                 kbps_padding: 5,
                 rtt_padding: 10
             }
         },
         default_ttl: 240,
         radar_availability_threshold: 90,
         rtt_tp_mix: 0.60,
         fallbackBehavior: {
             providers: {
                 'baz': {
                     cname: 'cn.baz.net',
                     kbps_padding: 0,
                     rtt_padding: 0
                 },
                 'bop': {
                     cname: 'cn.bop.net',
                     kbps_padding: 0,
                     rtt_padding: 0
                 }
             },
             default_ttl: 20,
             radar_availability_threshold: 85,
             rtt_tp_mix: 0.25
         }
     },*/
    geo_settings: {
        state: {
            'US-S-AR': { // Example of Arizona Settings.
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
        region: {},
        country: {
            'CN': { //Example of China Settings.
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
                rtt_tp_mix: 0.60/*,
                fallbackBehavior: {
                    providers: {
                        'baz': {
                            cname: 'cn.baz.net',
                            kbps_padding: 0,
                            rtt_padding: 0
                        },
                        'bop': {
                            cname: 'cn.bop.net',
                            kbps_padding: 0,
                            rtt_padding: 0
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 85,
                    rtt_tp_mix: 0.25
                }*/
            }
        },
        market: {},
        asn: {
            '7922': { //Example of Comcast ASN Settings.
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
                rtt_tp_mix: 0.60,
                fallbackBehavior: {
                    providers: {
                        'baz': {
                            cname: 'cn.baz.net',
                            kbps_padding: 0,
                            rtt_padding: 0
                        },
                        'bop': {
                            cname: 'cn.bop.net',
                            kbps_padding: 0,
                            rtt_padding: 0
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 85,
                    rtt_tp_mix: 0.25
                }
            }
        }
    }
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
            totalRtt = 0,
            totalKbps = 0,
            meanRtt = 1,
            meanKbps = 1,
            selectedCandidates,
            cname,
            fallbackBehavior;

        allReasons = {
            optimum_server_chosen: 'A',
            geo_override_on_state: 'B',
            geo_override_on_region: 'C',
            geo_override_on_country: 'D',
            geo_override_on_market: 'E',
            geo_override_on_asn: 'F',
            all_providers_eliminated_radar: 'G',
            all_providers_eliminated_sonar: 'H',
            geo_default: 'I',
            only_one_provider_avail: 'J',
            data_problem: 'K',
            sonar_data_problem: 'L',
            geo_fallback_behavior: 'M'
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
                candidates[key].http_rtt = candidates[key].http_rtt / meanRtt;
                if (candidates[key].http_kbps !== 0 && totalKbps !== 0) {
                    candidates[key].http_kbps = candidates[key].http_kbps / meanKbps;
                }
                // Adding weighted values for RTT and TP
                rttW = (rttTpMix-1) * candidates[key].http_rtt;
                tpW = rttTpMix * candidates[key].http_kbps;
                candidates[key].score = rttW + tpW;
            }
            return candidates;
        }

        /**
         * This also update the totalRtt and totalKbps value
         * @param {!Object.<string,{ http_rtt: number, http_kbps: number, rtt_padding: number, kbps_padding: number }>} candidates
         */
        function addPadding(candidates) {
            var keys = Object.keys(candidates),
                i = keys.length,
                key,
                rtt_padding,
                kbps_padding,
                kbpsDataLength = Object.keys(dataKbps).length;

            while (i --) {
                key = keys[i];
                rtt_padding = candidates[key].rtt_padding || 0;
                kbps_padding = candidates[key].kbps_padding || 0;
                candidates[key].http_rtt *= 1 + rtt_padding / 100;
                candidates[key].http_kbps = (kbpsDataLength > 0 && candidates[key].http_kbps) ? candidates[key].http_kbps * (1 - kbps_padding / 100) : 0;

                // Update the totals
                totalRtt += candidates[key].http_rtt;
                totalKbps += candidates[key].http_kbps;
            }

            if (totalRtt !== 0) {
                meanRtt = totalRtt / keys.length;
            }
            if (totalKbps !== 0) {
                meanKbps = totalKbps / keys.length;
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

                if (settings.geo_settings[geotype] !== undefined && settings.geo_settings[geotype][geo] !== undefined) {
                    // Override the settings by the Geo or the default if it isn't defined
                    candidates = settings.geo_settings[geotype][geo].providers || settings.default_settings.providers;
                    decisionTtl = settings.geo_settings[geotype][geo].default_ttl || settings.default_settings.default_ttl;
                    radarAvailabilityThreshold = settings.geo_settings[geotype][geo].radar_availability_threshold || settings.default_settings.radar_availability_threshold;
                    sonarAvailabilityThreshold = settings.geo_settings[geotype][geo].sonar_availability_threshold || settings.default_settings.sonar_availability_threshold;
                    minRtt = settings.geo_settings[geotype][geo].min_rtt || settings.default_settings.min_rtt;
                    rttTpMix = settings.geo_settings[geotype][geo].rtt_tp_mix || settings.default_settings.rtt_tp_mix;
                    fallbackBehavior = settings.geo_settings[geotype][geo].fallbackBehavior;

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


        function overrideFallbackSettingsByGeo() {
            // Override the fallback behavior by the Geo or use the default if it isn't defined
            candidates = fallbackBehavior.providers || candidates;
            decisionTtl = fallbackBehavior.default_ttl || decisionTtl;
            radarAvailabilityThreshold = fallbackBehavior.radar_availability_threshold || radarAvailabilityThreshold;
            sonarAvailabilityThreshold = fallbackBehavior.sonar_availability_threshold || sonarAvailabilityThreshold;
            minRtt = fallbackBehavior.min_rtt || minRtt;
            rttTpMix = fallbackBehavior.rtt_tp_mix || rttTpMix;

            decisionReasons.push(allReasons.geo_fallback_behavior);
        }

        function filterAvailRadarSonar(candidates, filterRadarAvailability, filterSonarAvailability) {
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

            return candidates;
        }

        // Provider eligibility check - filtering per Global_Settings or Geo_Settings
        candidates = overrideSettingByGeo();
        selectedCandidates = cloneObject(candidates);
        candidateAliases = Object.keys(selectedCandidates);

        if (((settings.use_sonar_availability_threshold === true && Object.keys(dataFusion).length > 0) || settings.use_sonar_availability_threshold === false)
            && ((settings.use_radar_availability_threshold === true && Object.keys(dataAvail).length > 0) || settings.use_radar_availability_threshold === false)
            && Object.keys(dataRtt).length > 0) {

            candidates = filterAvailRadarSonar(candidates, filterRadarAvailability, filterSonarAvailability); //filter by radar and sonar avail
            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 0 && fallbackBehavior !== undefined &&
                fallbackBehavior.providers !== undefined && Object.keys(fallbackBehavior.providers).length > 0 ) {
                overrideFallbackSettingsByGeo(); //override fallback behavior settings
                selectedCandidates = cloneObject(candidates);
                candidates = filterAvailRadarSonar(candidates, filterRadarAvailability, filterSonarAvailability);
                candidateAliases = Object.keys(candidates);
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

                if (Object.keys(dataKbps).length > 0) {
                    // Join the kbps scores with the list of viable candidates
                    candidates = intersectObjects(candidates, dataKbps, 'http_kbps');
                }

                candidateAliases = Object.keys(candidates);
                if (candidateAliases.length > 0) {

                    // Add kbps and rtt padding
                    // mean-normalized RTT and TP
                    candidates = addPadding(candidates);

                    // calculate scores
                    candidates = calculateScore(candidates);

                    decisionProvider = getHighest(candidates, 'score');
                    decisionReasons.push(allReasons.optimum_server_chosen);
                }
            }
        }

        if (decisionProvider === undefined) {
            candidates = fallbackBehavior && fallbackBehavior.providers && Object.keys(fallbackBehavior.providers).length > 0 ? fallbackBehavior.providers : settings.default_settings.providers;
            candidateAliases = Object.keys(candidates);
            decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
            decisionReasons.push(allReasons.data_problem);
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