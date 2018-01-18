
(function() {
    'use strict';

    var default_settings = {
        //rtt_padding
        //  value from 0 to 100
        //  it increases the value of 'http_rtt' of each provider with certain percentage.
        //  0 means increase 0% of the value, 100 means increase 100% of the value
        //  e.g: if a provider has a 'http_rtt = 100' and a 'rtt_padding: 20' is configured for that provider.
        //  The http_rtt value will increase on a 20 percent, giving a value of http_rtt = 120
        providers: {
            'foo': {
                cname: 'www.foo.com',
                rtt_padding: 0
            },
            'bar': {
                cname: 'www.bar.com',
                rtt_padding: 0
            },
            'baz': {
                cname: 'www.baz.com',
                rtt_padding: 0
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
        //if the top 2 Throughput providers are within tieThreshold %, use Throughput to break the tie
        //tie_theshold
        //  value from 0.01 to 0.99
        //when tie_theshold = 0.95, it will check if the difference between the best 2 providers is greater than 5%, OR,
        //  if tie_theshold = 0.90, it will check if the difference between the best 2 providers is greater than 10%, and so on.
        //if the dif is greater than x%, then the best one will be selected, but if it isn't, there will be a tie and 'highest kbps' criteria should be used to break it.
        tie_threshold: 0.95
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: sinon.stub()
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

    QUnit.test('default', function(assert) {
        test_do_init({
            setup: function() { return; },
            verify: function(i) {
                assert.equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
                assert.equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getProbe: sinon.stub()
                },
                response = {
                    respond: sinon.stub(),
                    setTTL: sinon.stub(),
                    setReasonCode: sinon.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };

            var random = sinon.stub(Math, 'random');

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
            random.restore();
        };
    }

    QUnit.test('best_performing_by_rtt', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 110
                        },
                        "baz": {
                            "http_kbps": 150
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 80
                        },
                        "baz": {
                            "http_rtt": 90
                        }
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('best_performing_by_kbps_rtt_tie', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 101
                        },
                        "bar": {
                            "http_kbps": 100
                        },
                        "baz": {
                            "http_kbps": 150
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 90
                        },
                        "baz": {
                            "http_rtt": 91
                        }
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });


    QUnit.test('best_performing_by_kbps', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 180
                        },
                        "bar": {
                            "http_kbps": 100
                        },
                        "baz": {
                            "http_kbps": 150
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({});
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('best_performing_by_kbps2_data_problem', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 70
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "bar": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('best_performing_by_rtt_with_padding', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 30
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 110
                        },
                        "baz": {
                            "http_kbps": 150
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 80
                        },
                        "baz": {
                            "http_rtt": 90
                        }
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('found_country', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 20
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 10
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {
                    'US': 'foo',
                    'CN': 'bar'
                },
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 110
                        },
                        "baz": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 90
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request.country = 'US';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('found_market', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 20
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 10
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {
                    'EU': 'baz',
                    'NA': 'foo'
                },
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 110
                        },
                        "baz": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 90
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request.market = 'EU';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('found_asn', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 20
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 10
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {
                    123: 'bar',
                    124: 'baz'
                },
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 110
                        },
                        "baz": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 90
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request.asn = 123;
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'H', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('data_problem_avail', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({});
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({});
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 120
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 90
                        }
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });


    QUnit.test('data_problem', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({});
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({});
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('all_providers_eliminated', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 50
                        },
                        "bar": {
                            "avail": 70
                        },
                        "baz": {
                            "avail": 60
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 100
                        },
                        "baz": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('all_but_one_eliminated', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        rtt_padding: 0
                    },
                    'bar': {
                        cname: 'www.bar.com',
                        rtt_padding: 0
                    },
                    'baz': {
                        cname: 'www.baz.com',
                        rtt_padding: 0
                    }
                },
                // A mapping of ISO 3166-1 country codes to provider aliases
                country_overrides: {},
                // A mapping of market codes to provider aliases
                market_overrides: {},
                // A mapping of ASN codes to provider aliases:  asn_overrides: { 123: 'baz', 124: 'bar' }
                asn_overrides: {},
                default_ttl: 20,
                availability_threshold: 90,
                tie_threshold: 0.95
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 50
                        },
                        "bar": {
                            "avail": 70
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        "foo": {
                            "http_kbps": 100
                        },
                        "bar": {
                            "http_kbps": 100
                        },
                        "baz": {
                            "http_kbps": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 100
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

}());