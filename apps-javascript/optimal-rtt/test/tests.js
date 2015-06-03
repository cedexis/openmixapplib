(function() {
    'use strict';

    module('do_init');

    function test_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings),
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

    test('basic', test_init({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            }
        },
        setup: function() {
            return;
        },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 2);
            equal(i.config.requireProvider.args[1][0], 'foo');
            equal(i.config.requireProvider.args[0][0], 'bar');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings),
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

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('foo fastest', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 201 }
            });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('foo fastest conditional hostname', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {
                'DE': '123',
                'UK': '456',
                'ES': '789'
            },
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 201 }
            });
            i.request.country = 'UK';
            i.request.hostname_prefix = 'UK';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], '456.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('foo fastest after padding', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    alias: 'foo',
                    cname: 'www.foo.com',
                    padding: 10
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 20
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('none available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.999999 },
                bar: { avail: 89.999999 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('geo override on market', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {
                'NA': 'bar'
            },
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying reason code');
        }
    }));

    test('geo override on country', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {
                'NA': 'bar'
            },
            country_to_provider: {
                'US': 'foo'
            },
            conditional_hostname: {},
            geo_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('country override provider not available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            country_to_provider: {
                'US': 'foo'
            },
            market_to_provider: {},
            conditional_hostname: {},
            geo_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.99999 },
                bar: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E,A', 'Verifying reason code');
        }
    }));

    test('country and market override provider both not available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            country_to_provider: {
                'US': 'foo'
            },
            market_to_provider: {
                'NA': 'bar'
            },
            conditional_hostname: {},
            geo_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.99999 },
                bar: { avail: 89.99999 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E,H,B', 'Verifying reason code');
        }
    }));

    test('country and market override provider both not available; blah faster than baz', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'blah': {
                    cname: 'www.blah.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            country_to_provider: {
                'US': 'foo'
            },
            market_to_provider: {
                'NA': 'bar'
            },
            conditional_hostname: {},
            geo_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.99999 },
                bar: { avail: 89.99999 },
                baz: { avail: 100 },
                blah: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 },
                baz: { http_rtt: 200 },
                blah: { http_rtt: 100 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'blah', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.blah.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E,H,A', 'Verifying reason code');
        }
    }));

    test('geo default on market', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {
                'NA': 'bar'
            },
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: true,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.99999 },
                bar: { avail: 89.99999 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying reason code');
        }
    }));

    test('geo default on country', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {
                'NA': 'bar'
            },
            country_to_provider: {
                'US': 'foo'
            },
            conditional_hostname: {},
            geo_override: false,
            geo_default: true,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 89.99999 },
                bar: { avail: 89.99999 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 200 },
                bar: { http_rtt: 200 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying reason code');
        }
    }));

    test('boost bar with padding', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: -70
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            country_to_provider: {},
            market_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 50 },
                bar: { http_rtt: 100 },
                baz: { http_rtt: 50 },
                qux: { http_rtt: 32 }
            });
            i.request.market = 'NA';
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('avoid by geo country (request from CN)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 200 }
            });
            i.request.country = 'CN';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('test-excep_country1', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0,
                    countries: [ 'CN' ]
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0,
                    except_country: ['CN']
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    except_country: ['CN']
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 200 }
            });
            i.request.country = 'CN';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('test-excep_country2', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0,
                    countries: [ 'CN' ]
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0,
                    except_country: ['CN']
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    except_country: ['CN']
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 200 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 200 }
            });
            i.request.country = 'NN';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('avoid by geo country (request from US)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 200 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 100 }
            });
            i.request.country = 'US';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('avoid by geo market (request from NA)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    // Considered only in the following markets
                    markets: [ 'NA', 'SA' ]
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 200 },
                qux: { http_rtt: 200 }
            });
            i.request.market = 'NA';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('avoid by geo market (request from SA)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    // Considered only in the following markets
                    markets: [ 'NA', 'SA' ]
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following countries
                    countries: [ 'CN' ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 200 },
                qux: { http_rtt: 200 }
            });
            i.request.market = 'SA';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('avoid by geo market (request from AS)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0,
                    // Considered only in the following markets
                    markets: [ 'NA', 'SA' ]
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 200 },
                qux: { http_rtt: 200 }
            });
            i.request.market = 'AS';
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('asn_override 1', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            asn_to_provider: {
                123: 'baz',
                124: 'bar'
            },
            conditional_hostname: {},
            geo_override: false,
            asn_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 200 },
                qux: { http_rtt: 200 }
            });
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'H', 'Verifying reason code');
        }
    }));

    test('asn_override_not_available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            asn_to_provider: {
                123: 'baz',
                124: 'bar'
            },
            conditional_hostname: {},
            geo_override: false,
            asn_override: true,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 80 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 200 },
                qux: { http_rtt: 201 }
            });
            i.request.asn = 124;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I,A', 'Verifying reason code');
        }
    }));

    test('avoid by geo asn (request from 123)', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding: 0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding: 0
                },
                'baz': {
                    cname: 'www.baz.com',
                    padding: 0
                },
                'qux': {
                    cname: 'www.qux.com',
                    padding: 0,
                    // Considered only in the following asns
                    asns: [ 123 ]
                }
            },
            availability_threshold: 90,
            market_to_provider: {},
            country_to_provider: {},
            conditional_hostname: {},
            geo_override: false,
            geo_default: false,
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            i.request.getProbe.onCall(0).returns({
                foo: { avail: 100 },
                bar: { avail: 100 },
                baz: { avail: 100 },
                qux: { avail: 100 }
            });
            i.request.getProbe.onCall(1).returns({
                foo: { http_rtt: 201 },
                bar: { http_rtt: 201 },
                baz: { http_rtt: 201 },
                qux: { http_rtt: 200 }
            });
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

}());
