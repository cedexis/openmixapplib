
(function() {
    'use strict';

    var default_settings = {
		// `providers` contains a list of the providers to be load-balanced (all the providers that can be used)
		// keys are the Openmix aliases set in the Portal
		providers: {
			'msft_akamai_win10': {
				cname: 'edgesuite.net'
			},
			'azure_front_door': {
				cname: 'msv-xboxlive-com.c-0007.c-msedge.net'
			}
		},

		conditional_hostname: {
			// add an entry for the provider if it's cname is intended to prepend the requesting FQDN.
			//
			'msft_akamai_win10' : {
				prepend : true
			},
			'azure_front_door' : {
				prepend : true
			}
		},

		geo_order: ['resolver', 'state_asn', 'region_asn', 'country_asn', 'market_asn', 'asn', 'state', 'region', 'country', 'market'],
		max_saved_providers: 800,

		// default_settings is used to have providers and configuration options for all geos that aren't defined in geo_settings map.
		default_settings: {
			providers: {
				'msft_akamai_win10': {
					manPenPct: 0 //This would be a 0% penalty on the score.
				},
				'azure_front_door': {
					manPenPct: 0 //This would be a 0% penalty on the score.
				}
			},
			//flag to turn on/off stickyness on the app
			//values true (turned on), false (turned off)
			use_sticky: true,
			// Only change a decision if there's a 15% change in score in a given country-asn map since last decision was issued.
			stickiness_percentage: 250, //e.g. 15 = 15%
			default_ttl: 20,
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
			perfWeightRoundRobin_numProvider: 3,
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
                'CN': {
                     providers: {
                     'msft_akamai_win10': {
                     //manPenPct: 0 //This would be a 0% penalty on the score.
                     },
                     'azure_front_door': {
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
                 }
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
             [ '150.101.135.62/32', 'msft_akamai_win10' ],
             [ '150.101.172.155/32', 'azure_front_door' ],
             [ '203.173.45.1/27', 'msft_akamai_win10' ]
             */
		]
    };

    module('do_init');

    function test_do_init(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: this.stub()
                },
                test_stuff = {
                    config: config
                };
            i.setup(test_stuff);
            sut = new OpenmixApplication(i.settings || default_settings);
            // Test
            sut.do_init(config);
            // Assert
            i.verify(test_stuff);
        };
    }

    test('default', test_do_init({
        setup: function() {
            return;
        },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 2);
            equal(i.config.requireProvider.args[0][0], 'azure_front_door');
            equal(i.config.requireProvider.args[1][0], 'msft_akamai_win10');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: this.stub()
                },
                request = {
                    getProbe: this.stub(),
                    getData: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub(),
					log: this.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);
            sut.do_init(config);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
            };

            this.stub(Math, 'random');


            i.setup(test_stuff);
            this.clock.now = i.timestamp ||  1457380800000; // now in minutes will be 24289680

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('market_cdns_randomly_selected_keeping_them_warm_false', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.market = 'NA';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,A,azure_front_door_score:1.724-msft_akamai_win10_score:1.303,V-new:NULL', 'Verifying reason code');
        }
    }));

    test('msft_area override', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
            i.request.country = 'JP';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'msft_akamai_win10', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'edgesuite.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'R,I,P', 'Verifying reason code');
        }
    }));

    test('country_cdns_randomly_selected_keeping_them_warm', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 93 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 90 },
                    'msft_akamai_win10': { http_kbps: 30 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
			i.request.asn = 123;
			i.request.country = 'CN';
			i.sut.cache.set('CN-123', 'azure_front_door');

		},
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available,Stickiness Considered-static', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available:azure_front_door_score:1.759-msft_akamai_win10_score:0.912,rttBenMin:25-rttBenAvg:12.5-rttBenMax:25,kbpsBenMin:60-kbpsBenAvg:30-kbpsBenMax:60,availBenMin:7-availBenAvg:3.5-availBenMax:7,numElegible:2,Stickiness Considered:-static;:azure_front_door:6.158', 'Verifying reason code');
		}
    }));

	test('one provider available', test_handle_request({
		setup: function(i) {
			console.log(i);
			i.request
			.getProbe
			.onCall(0)
			.returns({
				'azure_front_door': { avail: 100 },
				'msft_akamai_win10': { avail: 50 }
			});
			i.request
			.getProbe
			.onCall(1)
			.returns({
				'azure_front_door': { http_rtt: 60 },
				'msft_akamai_win10': {}
			});
			i.request
			.getProbe
			.onCall(2)
			.returns({
				'azure_front_door': { http_kbps: 90 },
				'msft_akamai_win10': { http_kbps: 30 }
			});
			i.request
			.getData
			.onCall(0)
			.returns({});
			Math.random.returns(0);
			i.request.asn = 123;
			i.request.country = 'CN';
			i.sut.cache.set('CN-123', 'azure_front_door');

		},
		verify: function(i) {
			console.log(i);
			equal(i.response.respond.callCount, 1, 'Verifying respond call count');
			equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
			equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

			equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
			equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
			equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
			equal(i.response.setReasonCode.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available,Stickiness Considered-static', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,One Provider Available:azure_front_door,rttBenMin:0-rttBenAvg:0-rttBenMax:0,kbpsBenMin:0-kbpsBenAvg:0-kbpsBenMax:0,availBenMin:0-availBenAvg:0-availBenMax:0,numElegible:1', 'Verifying reason code');
		}
	}));

	test('one provider available_2', test_handle_request({
		setup: function(i) {
			console.log(i);
			i.request
			.getProbe
			.onCall(0)
			.returns({
				'azure_front_door': { avail: 100 }
			});
			i.request
			.getProbe
			.onCall(1)
			.returns({
				'azure_front_door': { http_rtt: 60 },
				'msft_akamai_win10': { http_rtt: 35 }
			});
			i.request
			.getProbe
			.onCall(2)
			.returns({
				'azure_front_door': { http_kbps: 90 },
				'msft_akamai_win10': {}
			});
			i.request
			.getData
			.onCall(0)
			.returns({});
			Math.random.returns(0);
			i.request.asn = 123;
			i.request.country = 'CN';
			i.sut.cache.set('CN-123', 'azure_front_door');

		},
		verify: function(i) {
			console.log(i);
			equal(i.response.respond.callCount, 1, 'Verifying respond call count');
			equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
			equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

			equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
			equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
			equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
			equal(i.response.setReasonCode.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available,Stickiness Considered-static', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,One Provider Available:azure_front_door,rttBenMin:0-rttBenAvg:0-rttBenMax:0,kbpsBenMin:0-kbpsBenAvg:0-kbpsBenMax:0,availBenMin:0-availBenAvg:0-availBenMax:0,numElegible:1', 'Verifying reason code');
		}
	}));

	test('one provider available + no rtt data', test_handle_request({
		setup: function(i) {
			console.log(i);
			i.request
			.getProbe
			.onCall(0)
			.returns({
				'azure_front_door': { avail: 100 }
			});
			i.request
			.getProbe
			.onCall(1)
			.returns({
				'azure_front_door': {},
				'msft_akamai_win10': {}
			});
			i.request
			.getProbe
			.onCall(2)
			.returns({
				'azure_front_door': { http_kbps: 90 },
				'msft_akamai_win10': {}
			});
			i.request
			.getData
			.onCall(0)
			.returns({});
			Math.random.returns(0);
			i.request.asn = 123;
			i.request.country = 'CN';
			i.sut.cache.set('CN-123', 'azure_front_door');

		},
		verify: function(i) {
			console.log(i);
			equal(i.response.respond.callCount, 1, 'Verifying respond call count');
			equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
			equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

			equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
			equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
			equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
			equal(i.response.setReasonCode.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available,Stickiness Considered-static', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,One Provider Available:azure_front_door,kbpsBenMin:0-kbpsBenAvg:0-kbpsBenMax:0,availBenMin:0-availBenAvg:0-availBenMax:0,numElegible:1', 'Verifying reason code');
		}
	}));

    test('country_cdns_randomly_selected_keeping_them_warm_with-country_asn_geo', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
            i.request.country = 'GB';
            i.request.market = 'EU';
            i.request.asn = 5607;
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'Y,D,I,P', 'Verifying reason code');
        }
    }));

    test('country_cdns_only_one_avail', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
            i.request.country = 'AU';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'D,I,J', 'Verifying reason code');
        }
    }));

    test('no_market_default_cdns_randomly_selected_keeping_them_warm', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
            i.request.market = 'EU';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E,I,P', 'Verifying reason code');
        }
    }));

    test('default_cdns_randomly_selected_keeping_them_warm', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,P', 'Verifying reason code');
        }
    }));


    test('only_one_provider_avail', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,J', 'Verifying reason code');
        }
    }));

    test('optimum_server_chosen', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,M,A,highwinds_public_score:1.177-azure_front_door_score:1.447,V-new:NULL', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available:azure_front_door_score:1.724-msft_akamai_win10_score:1.303,Stickiness Considered:-static;:azure_front_door:6.034', 'Verifying reason code');

		}
    }));


    test('optimum_server_chosen_NOT_prevPenalties', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,A,highwinds_public_score:1.177-azure_front_door_score:1.447,V-new:NULL', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available:azure_front_door_score:1.724-msft_akamai_win10_score:1.303,Stickiness Considered:-static;:azure_front_door:6.034', 'Verifying reason code');

		}
    }));


    test('optimum_server_chosen_prevPenalties_time', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,U2,U2,A,highwinds_public_padPct:364_score:-5.180-azure_front_door_padPct:364_score:-6.368,V-new:NULL', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Override-Country,Geo Default,Optimal Provider Available:azure_front_door_score:1.724-msft_akamai_win10_score:1.303,Stickiness Considered:-static;:azure_front_door:6.034', 'Verifying reason code');

		}
    }));


    test('optimum_server_chosen_random_providers', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.2);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,M,highwinds_public_score:1.580-azure_front_door_score:2.078,T', 'Verifying reason code');
        }
    }));

    test('previous_provider_not_choosen', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.asn = 123;
            i.request.country = 'c';
            i.sut.cache.set('c-123', 'highwinds_public');
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,M,A,highwinds_public_score:1.177-azure_front_door_score:1.447,V-new:highwinds_public:1.354', 'Verifying reason code');
        }
    }));

    test('previous_provider_choosen', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.asn = 123;
            i.request.country = 'c';
            i.sut.cache.set('c-123', 'highwinds_public');
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,M,A,highwinds_public_score:1.285-azure_front_door_score:1.396,V-prev:highwinds_public:1.478', 'Verifying reason code');
        }
    }));

    test('previous_provider_choosen STATIC', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 35 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.asn = 123;
            i.request.country = 'c';
            i.sut.cache.set('c-123', 'azure_front_door');
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,M,A,highwinds_public_score:1.285-azure_front_door_score:1.396,V-static:azure_front_door:1.605', 'Verifying reason code');
        }
    }));

    test('optimum_server_chosen market override', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 160 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.market = 'NA';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'msft_akamai_win10', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'edgesuite.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E,I,Q,08:00:00-23:59:59,A,msft_akamai_win10_score:2.338-highwinds_public_timePct:15_score:0.865-azure_front_door_score:1.214,V-new:NULL', 'Verifying reason code');
        }
    }));

    test('optimum_server_chosen market override_capacity_used', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 160 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.country = 'AR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,CP:highwinds_public:0.87,CP:azure_front_door:0.99,A,highwinds_public_padPct:25_score:0.883-azure_front_door_padPct:90_score:0.145,V-new:NULL', 'Verifying reason code');
        }
    }));

    test('optimum_server_chosen market override_capacity_used_VALUE_0', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 160 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.country = 'AR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'azure_front_door', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msv-xboxlive-com.c-0007.c-msedge.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,CP:azure_front_door:0.99,J', 'Verifying reason code');
        }
    }));


    test('optimum_server_chosen market override_capacity_used_2', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 160 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.country = 'AR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,CP:highwinds_public:0.87,CP:azure_front_door:0.99,A,highwinds_public_padPct:25_score:0.883-azure_front_door_padPct:90_score:0.145,V-new:NULL', 'Verifying reason code');
        }
    }));

    test('optimum_server_chosen market override_capacity_used_prev_USED', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'azure_front_door': { avail: 100 },
                    'msft_akamai_win10': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'azure_front_door': { http_rtt: 60 },
                    'msft_akamai_win10': { http_rtt: 35 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({
                    'azure_front_door': { http_kbps: 60 },
                    'msft_akamai_win10': { http_kbps: 160 }
                });
            i.request
                .getData
                .onCall(0)
                .returns({});
            Math.random.returns(0.9);
            i.request.country = 'AR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,CP:highwinds_public:0.87,U2,CP:azure_front_door:0.99,U1,A,highwinds_public_padPct:64_score:0.424-azure_front_door_padPct:75_score:0.362,V-new:NULL', 'Verifying reason code');
        }
    }));

	test('data issue', test_handle_request({
		setup: function(i) {
			console.log(i);
			i.request
			.getProbe
			.onCall(0)
			.returns({
				'azure_front_door': { avail: 50 },
				'msft_akamai_win10': { avail: 20 }
			});
			i.request
			.getProbe
			.onCall(1)
			.returns({});
			i.request
			.getProbe
			.onCall(2)
			.returns({
				'azure_front_door': { http_kbps: 60 },
				'msft_akamai_win10': {}
			});
			i.request
			.getData
			.onCall(0)
			.returns({});
			Math.random.returns(0.9);
			i.request.country = 'AR';
		},
		verify: function(i) {
			console.log(i);
			equal(i.response.respond.callCount, 1, 'Verifying respond call count');
			equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
			equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

			equal(i.response.respond.args[0][0], 'highwinds_public', 'Verifying selected alias');
			equal(i.response.respond.args[0][1], 'msxbassets.vo.llnwd.net', 'Verifying CNAME');
			equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
			equal(i.response.setReasonCode.args[0][0], 'I,CP:data issue', 'Verifying reason code');
			equal(i.response.log.args[0][0], 'Geo Default,Data Issue,kbpsBenMin:0-kbpsBenAvg:0-kbpsBenMax:0,availBenMin:30-availBenAvg:15-availBenMax:30,numElegible:2', 'Verifying reason code');
		}
	}));


}());
