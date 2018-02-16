//Geo-Mixer template
var handler = new OpenmixApplication({
	// `providers` contains a list of the providers to be load-balanced (all the providers that can be used)
	// keys are the Openmix aliases set in the Portal
	providers: {
		'foo': {
			cname: 'foo.net'
		},
		'bar': {
			cname: 'bar.net'
		}
	},

	geo_order: ['resolver', 'state_asn', 'region_asn', 'country_asn', 'market_asn', 'asn', 'state', 'region', 'country', 'market'],
	max_saved_providers: 800,

	// default_settings is used to have providers and configuration options for all geos that aren't defined in geo_settings map.
	default_settings: {
		providers: {
			'foo': {
				manPenPct: 0 //This would be a 0% penalty on the score.
			},
			'bar': {
				manPenPct: 0 //This would be a 0% penalty on the score.
			}
		},
		//flag to turn on/off stickyness on the app
		//values true (turned on), false (turned off)
		use_sticky: true,
		// Only change a decision if there's a 15% change in score in a given country-asn map since last decision was issued.
		stickiness_percentage: 250, //e.g. 15 = 15%
		default_ttl: 240,
		use_radar_availability_threshold: true,
		use_sonar_availability_threshold: false, //set to true if you want Sonar healthchecks to be considered
		radar_availability_threshold: 90,
		rtt_tp_mix: 0.9,
		// to enable this feature's routing logic
		use_perfWeightRoundRobin: true,
		// this would dictate how often decisions would be routed with this logic.
		perfWeightRoundRobin_percentage: 50,
		// number of eligible providers to consider in the RR logic (ordered by score descending...the ones with the highest scores).
		//If null, consider all eligible providers for weighted round robin.
		perfWeightRoundRobin_numProvider: 2,
		// where b is numeric and greater than or equal to zero.
		perfWeightRoundRobinBias: 0.75,
		//flag to enable/disable the random selection on geo cdns
		use_random_threshold: false,
		//Value from 0 to 100
		//Percentage of probability to choose using Round Robin the GEO-based CDNs to keep them "warm"
		// 0.1 = 0.1%
		// 1 = 1%
		// 50 = 50%
		// and so on...
		random_threshold: 0
	},
	geo_settings: {
		state: {},
		region: {},
		country: {
			/*'CN': {
			 providers: {
			 'foo': {
			 //manPenPct: 0 //This would be a 0% penalty on the score.
			 },
			 'bar': {
			 //manPenPct: 0 //This would be a 0% penalty on the score.
			 }
			 },
			 radar_availability_threshold: 75,
			 use_perfWeightRoundRobin: false,
			 // this would dictate how often decisions would be routed with this logic.
			 perfWeightRoundRobin_percentage: 0,
			 // number of eligible providers to consider in the RR logic (ordered by score descending...the ones with the highest scores).
			 //If null, consider all eligible providers for weighted round robin.
			 perfWeightRoundRobin_numProvider: 0,
			 // where bias is numeric and greater than or equal to zero.
			 perfWeightRoundRobinBias: 0
			 }*/
		},
		market: {},
		asn: {},
		state_asn: {},
		region_asn: {},
		market_asn: {},
		country_asn: {},
		resolver: {}
	},
	// A mapping of address blocks to ONE provider alias
	// The providers here should exists in the settings.providers
	addressBlocks: [
		/*
		 [ '150.101.135.62/32', 'foo' ],
		 [ '150.101.172.155/32', 'bar' ],
		 [ '203.173.45.1/27', 'foo' ]
		 */
	]
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
	var cache = this.cache = new LRUCache(settings.max_saved_providers);
	var addressBlocks = settings.addressBlocks;
	/**
	 * @type {!Object.<string, Object>}
	 */
	var __fusionDataCache = {};

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
			dataSonar = parseSonarData(request.getData('sonar')),
			//used to limit the lenght of reasonCodes so that it can be properly displayed on reasonCodes report
			characterLimitReasonCodes = 99,
			candidates,
			candidatesRR,
			totalScore,
			decisionTtl = settings.default_settings.default_ttl,
			useRadarAvail,
			useSonarAvail,
			radarAvailabilityThreshold,
			minRtt = 1,
			rttTpMix,
			randomThreshold,
			useRandomThreshold,
			useSticky,
			stickinessPercentage,
			usePerfWeightRoundRobin,
			perfWeightRoundRobinPercentage,
			perfWeightRoundRobinNumProvider,
			perfWeightRoundRobinBias,
			cacheKey = request.country + "-" + request.asn,
			resolverIp = request.resolver_ip_address,
			previousProvider,
			candidateAliases,
			allReasons,
			decisionProvider,
			decisionReasons = [],
			reasonLog = [],
			totalRtt = 0,
			totalKbps = 0,
			meanRtt = 1,
			meanKbps = 1,
			selectedCandidates,
			cname,
			random = Math.random() * 100,
			scoreValues,
			candidatesAvail,
			benefitValues;

		allReasons = {
			optimal_provider_available: 'Optimal Provider Available',
			geo_override_state: 'Geo Override-State',
			geo_override_region: 'Geo Override-Region',
			geo_override_country: 'Geo Override-Country',
			geo_override_market: 'Geo Override-Market',
			geo_override_asn: 'Geo Override-ASN',
			all_providers_unavailable_radar: 'All Providers Unavailable-Radar',
			all_providers_unavailable_sonar: ' All Providers Unavailable-Sonar',
			geo_default: 'Geo Default',
			one_provider_available: 'One Provider Available',
			data_issue: 'Data Issue',
			ip_override: 'IP Override',
			geo_cdn_randomly_selected_keeping_warm: 'Geo CDN Randomly Selected Keeping Warm',
			stickiness_considered: 'Stickiness Considered',
			geo_override_state_asn: 'Geo Override-State+ASN',
			geo_override_region_asn: 'Geo Override-Region+ASN',
			geo_override_country_asn: 'Geo Override-Country+ASN',
			geo_override_market_asn: 'Geo Override-Market+ASN',
			perf_weighted_round_robin: 'Perf Weighted Round Robin',
			optimal_provider_unavailable_radar: 'Optimal Provider Unavailable-Radar',
			optimal_provider_unavailable_sonar: 'Optimal Provider Unavailable-Sonar',
			optimal_provider_unavailable_radar_sonar: 'Optimal Provider Unavailable-Radar+Sonar',
			round_robin_provider_unavailable_radar_sonar: 'Round Robin Provider Unavailable:Radar+Sonar'
		};

		/**
		 * @param candidates
		 */
		function getTotalScore(candidates) {
			var keys = Object.keys(candidates),
				i = keys.length,
				key,
				total = 0,
				score;
			while (i --) {
				key = keys[i];
				score = candidates[key].score;
				if (score !== undefined) {
					total += score;
				}
			}
			return total;
		}

		/**
		 * @param candidates
		 * @param max
		 */
		function getScoredRandom(candidates, max) {
			var random = Math.floor(Math.random() * max),
				mark = 0,
				keys = Object.keys(candidates),
				i = keys.length,
				key, score;
			while (i --) {
				key = keys[i];
				score = candidates[key].score;
				if (score !== undefined) {
					mark += score;
					if (random < mark) {
						return key;
					}
				}
			}
		}

		/**
		 * @param candidates,
		 * @param bias
		 */
		function calculateScoreWithBias(candidates, bias) {
			var keys = Object.keys(candidates),
				i = keys.length,
				key;

			while (i --) {
				key = keys[i];

				if (candidates[key].score > 0) {
					//score = score * e^(b*score)
					candidates[key].score = candidates[key].score * (Math.exp(bias * candidates[key].score));
				}
			}
			return candidates;
		}

		/**
		 * @param candidates
		 */
		function calculateScore(candidates) {
			var keys = Object.keys(candidates),
				i = keys.length,
				key,
				rttW,
				tpW,
				candidate,
				scores = [],
				lowestScore,
				stdScore;

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

				candidates[key].score = (rttW + tpW);

				scores.push(candidates[key].score);
			}

			candidate = getLowest(candidates, 'score', '');
			lowestScore = candidates[candidate].score;
			stdScore = Math.abs((1 + standardDeviation(scores)) * lowestScore);
			i = keys.length;

			while (i --) {
				key = keys[i];
				candidates[key].score += stdScore;

				//add manPenPct
				var manPenPct = candidates[key].manPenPct;

				if (manPenPct) {
					candidates[key].score -= (Math.abs(candidates[key].score) * (manPenPct / 100));
				}
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
				key;

			while (i --) {
				key = keys[i];

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
			return dataSonar[alias] !== undefined && dataSonar[alias].avail > 0;
		}

		// Override the settings if geo mapping is defined, if not use the default geo settings
		function overrideSettingByGeo() {
			var geotype, geoCombined, geo, i, inheritGeo = false, propertyInherited = false;

			/**
			 * @param property
			 * @param value
			 */
			function setProperty(property, value) {
				if (property === undefined) {
					if (value !== undefined) {
						propertyInherited = true;
						return value;
					}
					else {
						inheritGeo = true;
						return undefined;
					}
				}
				return property;
			}


			for (i = 0; i < settings.geo_order.length; i ++) {
				geotype = settings.geo_order[i];

				if (geotype === 'resolver') {
					geo = resolverIp;
				}
				else if (geotype.indexOf('_') !== -1) {
					// Combined geo
					geoCombined = geotype.split('_');
					geo = request[geoCombined[0]] + '_' + request[geoCombined[1]];
				} else {
					geo = request[geotype];
				}

				if (geo !== undefined && settings.geo_settings[geotype] !== undefined && settings.geo_settings[geotype][geo] !== undefined) {
					// Override the settings by the Geo or the default if it isn't defined
					var geoSettings = settings.geo_settings[geotype][geo];
					candidates = setProperty(candidates, geoSettings.providers);
					decisionTtl = setProperty(decisionTtl, geoSettings.default_ttl);
					useRadarAvail = setProperty(useRadarAvail, geoSettings.use_radar_availability_threshold);
					useSonarAvail = setProperty(useSonarAvail, geoSettings.use_sonar_availability_threshold);
					radarAvailabilityThreshold = setProperty(radarAvailabilityThreshold, geoSettings.radar_availability_threshold);
					rttTpMix = setProperty(rttTpMix, geoSettings.rtt_tp_mix);
					randomThreshold = setProperty(randomThreshold, geoSettings.random_threshold);
					useRandomThreshold = setProperty(useRandomThreshold, geoSettings.use_random_threshold);
					useSticky = setProperty(useSticky, geoSettings.use_sticky);
					stickinessPercentage = setProperty(stickinessPercentage, geoSettings.stickiness_percentage);
					usePerfWeightRoundRobin = setProperty(usePerfWeightRoundRobin, geoSettings.use_perfWeightRoundRobin);
					perfWeightRoundRobinPercentage = setProperty(perfWeightRoundRobinPercentage, geoSettings.perfWeightRoundRobin_percentage);
					perfWeightRoundRobinNumProvider = setProperty(perfWeightRoundRobinNumProvider, geoSettings.perfWeightRoundRobin_numProvider);
					perfWeightRoundRobinBias = setProperty(perfWeightRoundRobinBias, geoSettings.perfWeightRoundRobinBias);

					if (propertyInherited) {
						decisionReasons.push(allReasons['geo_override_' + geotype]);
						reasonLog.push(allReasons['geo_override_' + geotype]);
					}
					if (!inheritGeo) {
						return candidates;
					}
					else {
						inheritGeo = false;
						propertyInherited = false;
					}
				}
			}

			// Use default geo
			candidates = setProperty(candidates, settings.default_settings.providers);
			decisionTtl = setProperty(decisionTtl, settings.default_settings.default_ttl);
			useRadarAvail = setProperty(useRadarAvail, settings.default_settings.use_radar_availability_threshold);
			useSonarAvail = setProperty(useSonarAvail, settings.default_settings.use_sonar_availability_threshold);
			radarAvailabilityThreshold = setProperty(radarAvailabilityThreshold, settings.default_settings.radar_availability_threshold);
			rttTpMix = setProperty(rttTpMix, settings.default_settings.rtt_tp_mix);
			randomThreshold = setProperty(randomThreshold, settings.default_settings.random_threshold);
			useRandomThreshold = setProperty(useRandomThreshold, settings.default_settings.use_random_threshold);
			useSticky = setProperty(useSticky, settings.default_settings.use_sticky);
			stickinessPercentage = setProperty(stickinessPercentage, settings.default_settings.stickiness_percentage);
			usePerfWeightRoundRobin = setProperty(usePerfWeightRoundRobin, settings.default_settings.use_perfWeightRoundRobin);
			perfWeightRoundRobinPercentage = setProperty(perfWeightRoundRobinPercentage, settings.default_settings.perfWeightRoundRobin_percentage);
			perfWeightRoundRobinNumProvider = setProperty(perfWeightRoundRobinNumProvider, settings.default_settings.perfWeightRoundRobin_numProvider);
			perfWeightRoundRobinBias = setProperty(perfWeightRoundRobinBias, settings.default_settings.perfWeightRoundRobinBias);

			decisionReasons.push(allReasons.geo_default);
			reasonLog.push(allReasons.geo_default);
			return candidates;
		}

		/**
		 * @param {!Object} source
		 * @param {string} property
		 */
		function getRadarLogs(source, property) {
			var keys = Object.keys(source),
				i = keys.length,
				key,
				prefix,
				values = [],
				logs = [],
				best,
				second,
				worst,
				avg,
				benMin,
				benAvg,
				benMax;

			switch (property) {
				case 'avail':
					prefix = 'avail';
					break;
				case 'http_rtt':
					prefix = 'rtt';
					break;
				case 'http_kbps':
					prefix = 'kbps';
			}

			if (property === 'http_rtt') {
				best = getLowest(source, property, '');
				second = getLowest(source, property, best);
				worst = getHighest(source, property, '');
			}
			else {
				best = getHighest(source, property, '');
				second = getHighest(source, property, best);
				worst = getLowest(source, property, '');
			}

			best = source[best][property];
			second = source[second][property];
			worst = source[worst][property];

			while (i --) {
				key = keys[i];
				values.push(source[key][property]);
			}

			avg = average(values);

			if (property === 'http_rtt') {
				benMin = second - best;
				benAvg = avg - best;
				benMax = worst - best;
			}
			else {
				benMin = best - second;
				benAvg = best - avg;
				benMax = best - worst;
			}

			logs.push(prefix + 'BenMin:'+ benMin);
			logs.push(prefix + 'BenAvg:'+ benAvg);
			logs.push(prefix + 'BenMax:'+ benMax);

			return logs.join('-');
		}

		/**
		 * @param {!Object} source
		 * @param {!Object} radarData
		 * @param {string} property
		 */
		function getBenefitLogs(source, radarData ,property) {
			var value,
				candidates = {};

			if (Object.keys(radarData).length > 1) {
				candidates = intersectObjects(source, radarData, property);

				if (Object.keys(candidates).length > 1) {
					value = getRadarLogs(candidates, property);
				}
			}

			return value;
		}

		/**
		 * @param {!Object} source
		 */
		function calculateRadarBenefits(source) {
			benefitValues = getBenefitLogs(source, dataRtt, 'http_rtt');
			if (benefitValues) {
				reasonLog.push(benefitValues);
			}
			benefitValues = getBenefitLogs(source, dataKbps, 'http_kbps');
			if (benefitValues) {
				reasonLog.push(benefitValues);
			}
			benefitValues = getBenefitLogs(source, dataAvail, 'avail');
			if (benefitValues) {
				reasonLog.push(benefitValues);
			}
			reasonLog.push('numElegible:' + Object.keys(source).length);
		}

		function addressBlocksOverride() {
			var l = addressBlocks.length,
				i;
			for (i = 0; i < l; i++) {
				var currentBlock = addressBlocks[i];
				try {
					if (currentBlock[2].contains(request.ip_address)) {
						return currentBlock[1];
					}
				} catch (err) {}
			}
		}

		this.parseAddressBlocks();

		// Check IP override
		decisionProvider = addressBlocksOverride();

		if (decisionProvider) {
			decisionReasons.push(allReasons.ip_override);
			reasonLog.push(allReasons.ip_override + ':' + decisionProvider);
		} else {
			// Provider eligibility check - filtering per Global_Settings or Geo_Settings
			candidates = overrideSettingByGeo();

			if (useSticky) {
				// Get sticky provider from cache
				previousProvider = cache.get(cacheKey);
			}

			selectedCandidates = cloneObject(candidates);
			candidateAliases = Object.keys(selectedCandidates);

			if (((useSonarAvail === true && Object.keys(dataSonar).length > 0) || useSonarAvail === false)
				&& ((useRadarAvail === true && Object.keys(dataAvail).length > 0) || useRadarAvail === false)
				&& Object.keys(dataRtt).length > 0) {

				if (useRadarAvail) {
					candidates = filterObject(candidates, filterRadarAvailability);
					candidateAliases = Object.keys(candidates);
					if (candidateAliases.length === 0) {
						decisionReasons.push(allReasons.all_providers_unavailable_radar);
						reasonLog.push(allReasons.all_providers_unavailable_radar);
					}
				}

				if (candidateAliases.length > 0 && useSonarAvail) {
					candidates = filterObject(candidates, filterSonarAvailability);
					candidateAliases = Object.keys(candidates);
					if (candidateAliases.length === 0) {
						decisionReasons.push(allReasons.all_providers_unavailable_sonar);
						reasonLog.push(allReasons.all_providers_unavailable_sonar);
					}
				}

				if (candidateAliases.length === 0) {
					// Filter sonar, only use sonar available provider, at least all of them are unavailable
					candidates = filterObject(selectedCandidates, filterSonarAvailability);
					candidateAliases = Object.keys(candidates);

					if (candidateAliases.length > 0) {
						candidates = intersectObjects(candidates, dataAvail, 'avail');
						if (Object.keys(candidates).length > 0) {
							decisionProvider = getHighest(candidates, 'avail', '');
						} else {
							decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
						}
					} else {
						// Join the avail scores with the list of viable candidates
						candidates = intersectObjects(cloneObject(selectedCandidates), dataAvail, 'avail');
						candidateAliases = Object.keys(candidates);
						if (candidateAliases.length > 0) {
							decisionProvider = getHighest(candidates, 'avail', '');
						}
					}
					if (Object.keys(candidates).length > 0 && decisionProvider) {
						// adding benefits rtt, kbps, avail logs
						calculateRadarBenefits(candidates);
					}
				} else if (candidateAliases.length === 1) {
					decisionProvider = candidateAliases[0];
					decisionReasons.push(allReasons.one_provider_available);
					reasonLog.push(allReasons.one_provider_available + ':' + decisionProvider);
				} else {
					if (useRandomThreshold && random <= randomThreshold) {
						//x% of times, logic will enter here to keep GEO cdns warm
						decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
						decisionReasons.push(allReasons.geo_cdn_randomly_selected_keeping_warm);
						reasonLog.push(allReasons.geo_cdn_randomly_selected_keeping_warm + ':' + decisionProvider);
						// adding benefits rtt, kbps, avail logs
						calculateRadarBenefits(candidates);
					}
					else {
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
							// mean-normalized RTT and TP
							candidates = addPadding(candidates);

							// calculate scores
							candidates = calculateScore(candidates);

							candidateAliases = Object.keys(candidates);

							if (candidateAliases.length > 1) {

								if (usePerfWeightRoundRobin
									&& random <= perfWeightRoundRobinPercentage
									&& (perfWeightRoundRobinNumProvider > 0 || perfWeightRoundRobinNumProvider === null)) {

									//change score with bias
									if (perfWeightRoundRobinBias) {
										// calculate scores
										candidates = calculateScoreWithBias(candidates, perfWeightRoundRobinBias);
									}

									candidatesRR = getHighestProvidersOrdered(candidates, 'score', perfWeightRoundRobinNumProvider);
									if (Object.keys(candidatesRR).length > 0) {
										totalScore = getTotalScore(candidatesRR);

										if (totalScore > 0) {
											scoreValues = getLogs(candidates, 'score');
											decisionProvider = getScoredRandom(candidatesRR, totalScore);
											decisionReasons.push(allReasons.perf_weighted_round_robin);
											reasonLog.push(allReasons.perf_weighted_round_robin + ':' + scoreValues);
											// adding benefits rtt, kbps, avail logs
											calculateRadarBenefits(candidatesRR);
										}
									}
								}
								if (decisionProvider === undefined) {
									decisionProvider = getHighest(candidates, 'score', '');
									decisionReasons.push(allReasons.optimal_provider_available);
									scoreValues = getLogs(candidates, 'score');
									reasonLog.push(allReasons.optimal_provider_available + ':' + scoreValues);
									// adding benefits rtt, kbps, avail logs
									calculateRadarBenefits(candidates);

									if (useSticky) {
										var providerSelected = '-new',
											previousScore,
											previousScoreLog = ':NULL';

										if (previousProvider !== undefined && candidates[previousProvider] !== undefined) {
											previousScore = candidates[previousProvider].score * (1 + stickinessPercentage / 100);
											previousScoreLog = ':' + previousProvider + ':' + previousScore.toFixed(3);
											if (previousProvider !== decisionProvider && candidates[decisionProvider].score <= previousScore) {
												decisionProvider = previousProvider;
												providerSelected = '-prev';
											}
											else if (previousProvider === decisionProvider) {
												providerSelected = '-static';
											}
										}
										decisionReasons.push(allReasons.stickiness_considered + providerSelected);
										reasonLog.push(allReasons.stickiness_considered + ':' + providerSelected + ';' + previousScoreLog);
									}

								}

							}
							else if (candidateAliases.length === 1) {
								decisionProvider = candidateAliases[0];
								decisionReasons.push(allReasons.one_provider_available);
								reasonLog.push(allReasons.one_provider_available + ':' + decisionProvider);
							}
						}
					}
				}
			}

			if (decisionProvider === undefined) {
				candidates = settings.default_settings.providers;

				candidatesAvail = filterObject(candidates, filterSonarAvailability);
				candidateAliases = Object.keys(candidatesAvail);

				if (candidateAliases.length > 0) {
					candidates = intersectObjects(candidatesAvail, dataAvail, 'avail');
					if (Object.keys(candidates).length > 0) {
						decisionProvider = getHighest(candidates, 'avail', '');
					} else {
						decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
					}
				} else {
					candidateAliases = Object.keys(candidates);
					decisionProvider = candidateAliases[Math.floor(Math.random() * candidateAliases.length)];
				}

				decisionReasons.push(allReasons.data_issue);
				reasonLog.push(allReasons.data_issue);
				// adding benefits rtt, kbps, avail logs
				calculateRadarBenefits(candidates);
			}

			if (decisionReasons.indexOf(allReasons.geo_cdn_randomly_selected_keeping_warm) === -1
				&& decisionReasons.indexOf(allReasons.data_issue) === -1
				&& decisionProvider !== previousProvider) {
				cache.set(cacheKey, decisionProvider);
			}
		}

		if ((useSonarAvail === true && Object.keys(dataSonar).length > 0)
			|| (useRadarAvail === true && Object.keys(dataAvail).length > 0)) {

			var isNotAvailRadar = false,
				isNotAvailSonar = false;

			if (useRadarAvail && dataAvail[decisionProvider] === undefined) {
				isNotAvailRadar = true;
			}
			if (useSonarAvail && dataSonar[decisionProvider] === undefined) {
				isNotAvailSonar = true;
			}

			if ((decisionReasons.indexOf(allReasons.geo_cdn_randomly_selected_keeping_warm) !== -1
				|| decisionReasons.indexOf(allReasons.data_issue) !== -1)
				&& (isNotAvailRadar || isNotAvailSonar)) {
				decisionReasons.push(allReasons.round_robin_provider_unavailable_radar_sonar);
				reasonLog.push(allReasons.round_robin_provider_unavailable_radar_sonar);
			}
			else if (isNotAvailRadar && isNotAvailSonar) {
				decisionReasons.push(allReasons.optimal_provider_unavailable_radar_sonar);
				reasonLog.push(allReasons.optimal_provider_unavailable_radar_sonar);
			}
			else if (isNotAvailRadar) {
				decisionReasons.push(allReasons.optimal_provider_unavailable_radar);
				reasonLog.push(allReasons.optimal_provider_unavailable_radar);
			}
			else if (isNotAvailSonar) {
				decisionReasons.push(allReasons.optimal_provider_unavailable_sonar);
				reasonLog.push(allReasons.optimal_provider_unavailable_sonar);
			}

		}

		cname = selectedCandidates
		&& selectedCandidates[decisionProvider]
		&& selectedCandidates[decisionProvider].cname
			? selectedCandidates[decisionProvider].cname
			: settings.providers[decisionProvider].cname;


		decisionReasons = decisionReasons.join(',');
		if (decisionReasons.length >= characterLimitReasonCodes && characterLimitReasonCodes) {
			//if reasonCode is too long, reduce it so it can be displayed on reason codes report
			decisionReasons = decisionReasons.substring(0, characterLimitReasonCodes - 3);
			decisionReasons += '...';
		}

		response.respond(decisionProvider, cname);
		response.setTTL(decisionTtl);
		response.setReasonCode(decisionReasons);
		response.log(reasonLog.join(','));
	};

	this.parseAddressBlocks = function() {
		for (var i = 0; i < addressBlocks.length; i++) {
			var temp = addressBlocks[i];
			temp.push(new Netmask(temp[0]));
		}
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

	/** @constructor */
	function LRUCache(maxSize) {
		var index = [],
			values = {},
			lastIndex = 0;

		/**
		 * @param {string} key
		 * @param {string | number} value
		 */
		this.set = function(key, value) {
			if (this.get(key) === undefined) {
				if (lastIndex < maxSize) {
					lastIndex ++;
				}
				else {
					delete values[index.splice(0, 1)[0]];
				}
			}

			index[lastIndex] = key;
			values[key] = value;
		};

		/**
		 * @param {string} key
		 */
		this.get = function(key) {
			var value = values[key];

			if (value !== undefined) {
				index.splice(index.indexOf(key), 1);
				index[lastIndex] = key;
			}

			return value;
		};
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
			if (key !== exclude) {
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
	 * @param {!Object} source
	 * @param {string} property
	 * @param {number} number
	 */
	function getHighestProvidersOrdered(source, property, number) {
		var keys = Object.keys(source),
			i = keys.length,
			j = keys.length,
			key,
			candidate = null,
			candidates= {},
			max = -Infinity,
			value;

		if (number === null) {
			number = j;
		}

		while (j-- && number--) {
			while (i--) {
				key = keys[i];
				value = source[key][property];
				if (candidates[key] === undefined && value > max && value > 0) {
					candidate = key;
					max = value;
				}
			}
			if (candidate !== null) {
				candidates[candidate] = source[candidate];
			}
			candidate = null;
			i = keys.length;
			max = -Infinity;
		}
		return candidates;
	}

	/**
	 * @param {!Object} source
	 * @param {string} property
	 * @param {string} exclude
	 */
	function getLowest(source, property, exclude) {
		var keys = Object.keys(source),
			i = keys.length,
			key,
			candidate,
			min = Infinity,
			value;
		while (i --) {
			key = keys[i];
			if (exclude === '' || key !== exclude) {
				value = source[key][property];

				if (value < min) {
					candidate = key;
					min = value;
				}
			}
		}
		return candidate;
	}

	/**
	 * @param {!Object} source
	 * @param {string} property
	 */
	function getLogs(source, property) {
		var keys = Object.keys(source),
			i = keys.length,
			key,
			value = [];

		while (i --) {
			key = keys[i];
			if (source[key][property]) {
				value.push(key + '_' + property + ':' + source[key][property].toFixed(3));
			}
		}
		return value.join('-');
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

	function standardDeviation(values) {
		var avg = average(values);

		var squareDiffs = values.map(function(value){
			var diff = value - avg;
			var sqrDiff = diff * diff;
			return sqrDiff;
		});

		var avgSquareDiff = average(squareDiffs);

		var stdDev = Math.sqrt(avgSquareDiff);
		return stdDev;
	}

	function average(data){
		var sum = data.reduce(function(sum, value){
			return sum + value;
		}, 0);

		var avg = sum / data.length;
		return avg;
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

}// Generated by CoffeeScript 1.10.0

/*
 (The MIT License)

 Copyright (c) 2011 Olivier Poitrey rs@dailymotion.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Netmask, ip2long, long2ip;

long2ip = function(long) {
	var a, b, c, d;
	a = (long & (0xff << 24)) >>> 24;
	b = (long & (0xff << 16)) >>> 16;
	c = (long & (0xff << 8)) >>> 8;
	d = long & 0xff;
	return [a, b, c, d].join('.');
};

ip2long = function(ip) {
	var b, byte, i, j, len;
	b = (ip + '').split('.');
	if (b.length === 0 || b.length > 4) {
		throw new Error('Invalid IP');
	}
	for (i = j = 0, len = b.length; j < len; i = ++j) {
		byte = b[i];
		if (isNaN(parseInt(byte, 10))) {
			throw new Error("Invalid byte: " + byte);
		}
		if (byte < 0 || byte > 255) {
			throw new Error("Invalid byte: " + byte);
		}
	}
	return ((b[0] || 0) << 24 | (b[1] || 0) << 16 | (b[2] || 0) << 8 | (b[3] || 0)) >>> 0;
};

Netmask = (function() {
	function Netmask(net, mask) {
		var error, error1, error2, i, j, ref;
		if (typeof net !== 'string') {
			throw new Error("Missing `net' parameter");
		}
		if (!mask) {
			ref = net.split('/', 2), net = ref[0], mask = ref[1];
			if (!mask) {
				switch (net.split('.').length) {
					case 1:
						mask = 8;
						break;
					case 2:
						mask = 16;
						break;
					case 3:
						mask = 24;
						break;
					case 4:
						mask = 32;
				}
			}
		}
		if (typeof mask === 'string' && mask.indexOf('.') > -1) {
			try {
				this.maskLong = ip2long(mask);
			} catch (error1) {
				error = error1;
				throw new Error("Invalid mask: " + mask);
			}
			for (i = j = 32; j >= 0; i = --j) {
				if (this.maskLong === (0xffffffff << (32 - i)) >>> 0) {
					this.bitmask = i;
					break;
				}
			}
		} else if (mask) {
			this.bitmask = parseInt(mask, 10);
			this.maskLong = (0xffffffff << (32 - this.bitmask)) >>> 0;
		} else {
			throw new Error("Invalid mask: empty");
		}
		try {
			this.netLong = (ip2long(net) & this.maskLong) >>> 0;
		} catch (error2) {
			error = error2;
			throw new Error("Invalid net address: " + net);
		}
		if (!(this.bitmask <= 32)) {
			throw new Error("Invalid mask for ip4: " + mask);
		}
		this.size = Math.pow(2, 32 - this.bitmask);
		this.base = long2ip(this.netLong);
		this.mask = long2ip(this.maskLong);
		this.hostmask = long2ip(~this.maskLong);
		this.first = this.bitmask <= 30 ? long2ip(this.netLong + 1) : this.base;
		this.last = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 2) : long2ip(this.netLong + this.size - 1);
		this.broadcast = this.bitmask <= 30 ? long2ip(this.netLong + this.size - 1) : void 0;
	}

	Netmask.prototype.contains = function(ip) {
		if (typeof ip === 'string' && (ip.indexOf('/') > 0 || ip.split('.').length !== 4)) {
			ip = new Netmask(ip);
		}
		if (ip instanceof Netmask) {
			return this.contains(ip.base) && this.contains(ip.broadcast || ip.last);
		} else {
			return (ip2long(ip) & this.maskLong) >>> 0 === (this.netLong & this.maskLong) >>> 0;
		}
	};

	Netmask.prototype.next = function(count) {
		if (count == null) {
			count = 1;
		}
		return new Netmask(long2ip(this.netLong + (this.size * count)), this.mask);
	};

	Netmask.prototype.forEach = function(fn) {
		var index, j, k, len, long, range, ref, ref1, results, results1;
		range = (function() {
			results = [];
			for (var j = ref = ip2long(this.first), ref1 = ip2long(this.last); ref <= ref1 ? j <= ref1 : j >= ref1; ref <= ref1 ? j++ : j--){ results.push(j); }
			return results;
		}).apply(this);
		results1 = [];
		for (index = k = 0, len = range.length; k < len; index = ++k) {
			long = range[index];
			results1.push(fn(long2ip(long), long, index));
		}
		return results1;
	};

	Netmask.prototype.toString = function() {
		return this.base + "/" + this.bitmask;
	};

	return Netmask;

})();
