(function() {
    'use strict';

    var default_settings = {
        providers: {
            'a': {
                cname: 'a.com'
            },
            'b': {
                cname: 'b.com'
            },
            'c': {
                cname: 'c.com'
            }
        },
        availability_threshold: 90,
        throughput_tie_threshold: 0.95,
        default_ttl: 20,
        error_ttl: 20,
        min_valid_rtt_score: 5
    };

    module('do_init');

    function test_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    config: config
                };

            i.setup(test_stuff);

            // Test
            sut.do_init(config);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('calls requiresProvider', test_init({
        setup: function() { return; },
        verify: function(i) {
            deepEqual(
                i.config.requireProvider.args,
                [
                    [ 'c' ],
                    [ 'b' ],
                    [ 'a' ]
                ]
            );
        }
    }));

    module('handle_request');

    function test_onRequest(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };

            this.stub(Math, 'random');
            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('b fastest but unavailable; c missing KBPS data', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99999 },
                    'c': { avail: 90 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 6000 }
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 200 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'A2' ] ], 'Verifying setReasonCode');
                equal(Math.random.callCount, 0);
            }
        }
    ));

    test('b fastest but unavailable; no tie', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99999 },
                    'c': { avail: 90 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 6000 },
                    'c': { http_kbps: 7000 }
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 200 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'A1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('tie; b has fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 90 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 5000 },
                    'c': { http_kbps: 5000 }
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 199 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'B1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('c unavailable; no KBPS data; b fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 89.99999 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 150 },
                    'b': { http_rtt: 149 },
                    'c': { http_rtt: 100 }
                });
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'B2' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('only one provider available', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99998 },
                    'c': { avail: 89.99999 }
                });
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'D1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all unavailable', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 89.99997 },
                    'b': { avail: 89.99998 },
                    'c': { avail: 89.99999 }
                });
                Math.random.returns(0.99);
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'D1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all available; no KBPS or RTT data', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 90 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                Math.random.returns(0.6789);
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'C1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('no data', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                Math.random.returns(0.6789);
            },
            verify: function(i) {
                deepEqual(i.response.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'D2' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('no KBPS data for available providers', test_onRequest(
        {
            setup: function(i) {
                i.request.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 89.99999 }
                });
                i.request.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': { http_kbps: 4000 }
                });
                i.request.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': { http_rtt: 200 }
                });
                Math.random.returns(0.0101);
            },
            verify: function(i) {
                deepEqual(
                    i.response.respond.args,
                    [
                        [
                            'a',
                            'a.com'
                        ]
                    ],
                    'Verifying respond'
                );
                deepEqual(i.response.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.response.setReasonCode.args, [ [ 'C1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('geo_override_on_country ', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: true,
            asn_override: false,
            asn_to_provider: {},
            market_to_provider: {},
            country_to_provider: {
                'US': 'b'
            }
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 90 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'b', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'b.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
        }
    }));

    test('geo_override_not_available_country ', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: true,
            asn_override: false,
            asn_to_provider: {},
            market_to_provider: {},
            country_to_provider: {
                'US': 'b'
            }
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 89 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'c', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'c.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'F,A2', 'Verifying reason code');
        }
    }));

    test('asn_override ', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: false,
            asn_override: true,
            asn_to_provider: {
                123: 'b',
                124: 'c'
            },
            country_to_provider: {}
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 90 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'b', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'b.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying reason code');
        }
    }));

    test('asn_override_not_available', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: false,
            asn_override: true,
            asn_to_provider: {
                123: 'b',
                124: 'c'
            },
            country_to_provider: {}
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 80 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'c', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'c.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'H,A2', 'Verifying reason code');
        }
    }));

    test('geo_override_on_market ', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: true,
            asn_override: false,
            asn_to_provider: {},
            country_to_provider: {},
            market_to_provider: {
                'M1': 'b'
            }
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 90 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.market = 'M1';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'b', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'b.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I', 'Verifying reason code');
        }
    }));

    test('geo_override_not_available_market ', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: true,
            asn_override: false,
            asn_to_provider: {},
            country_to_provider: {},
            market_to_provider: {
                'M1': 'b'
            }
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 89 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': {},
                'b': {},
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 200 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 200 }
            });
            Math.random.returns(0.0101);
            i.request.market = 'M1';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'c', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'c.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'J,A2', 'Verifying reason code');
        }
    }));

    test('avoid by geo asn (request from 123)', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com',
                    asns: [123]
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: false,
            asn_override: false,
            asn_to_provider: {},
            market_to_provider: {},
            country_to_provider: {}
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 90 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': { http_kbps: 4000 },
                'b': { http_kbps: 4000 },
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 201 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 202 }
            });
            Math.random.returns(0.0101);
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'b', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'b.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B1', 'Verifying reason code');
        }
    }));

    test('avoid by geo asn (request from 124)', test_onRequest({
        settings: {
            providers: {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com',
                    asns: [123]
                },
                'c': {
                    cname: 'c.com'
                }
            },
            availability_threshold: 90,
            throughput_tie_threshold: 0.95,
            default_ttl: 20,
            error_ttl: 20,
            min_valid_rtt_score: 5,
            geo_override: false,
            asn_override: false,
            asn_to_provider: {},
            market_to_provider: {},
            country_to_provider: {}
        },
        setup: function(i) {
            i.request.getProbe.withArgs('avail').returns({
                'a': { avail: 90 },
                'b': { avail: 90 },
                'c': { avail: 90 }
            });
            i.request.getProbe.withArgs('http_kbps').returns({
                'a': { http_kbps: 4000 },
                'b': { http_kbps: 4000 },
                'c': { http_kbps: 4000 }
            });
            i.request.getProbe.withArgs('http_rtt').returns({
                'a': { http_rtt: 201 },
                'b': { http_rtt: 200 },
                'c': { http_rtt: 202 }
            });
            Math.random.returns(0.0101);
            i.request.asn = 124;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'a', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'a.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B1', 'Verifying reason code');
        }
    }));

}());
