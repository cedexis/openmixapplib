
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
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            }
        },
        setup: function() {
            return;
        },
        verify: function(i) {
            console.log(i);
            equal(i.config.requireProvider.callCount, 3);
            equal(i.config.requireProvider.args[2][0], 'foo');
            equal(i.config.requireProvider.args[1][0], 'bar');
            equal(i.config.requireProvider.args[0][0], 'baz');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings),
                request = {
                    getData: this.stub()
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

    test('geo country overrides, no sonar data', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'EG';
            i.request
                .getData
                .onCall(0)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('geo markets overrides, no sonar data', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'US';
            i.request.market = 'EG';
            i.request
                .getData
                .onCall(0)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('unexpected market, no sonar data', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'US';
            i.request.market = 'FR';
            i.request
                .getData
                .onCall(0)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('selected geo country provider is not below sonar threshold', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'FR';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.89,
                    "bar": 0.95
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('disregard geo override, select only provider where sonar score above threshold', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'FR';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.95,
                    "bar": 0.89,
                    "baz": 0.70
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
        }
    }));

   test('verify default provider selected when no sonar providers available', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'FR';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.89,
                    "bar": 0.89,
                    "baz": 0.70
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'EC', 'Verifying reason code');
        }
    }));

   test('all sonar scores are good, select geo market override', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'US';
            i.request.market = 'EG';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.90,
                    "bar": 0.90,
                    "baz": 0.90
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

test('geo country fails sonar, select next available sonar provider', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'US': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'EG';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.90,
                    "bar": 0.70,
                    "baz": 0.90
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            notEqual(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            notEqual(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
        }
    }));

test('test sonar_data_required flag returns only available platform', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com'
                },
                'bar': {
                    cname: 'www.bar.com'
                },
                'baz': {
                    cname: 'www.baz.com'
                }
            },
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'US': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10,
            sonar_threshold: 0.9,
            require_sonar_data: true
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'EG';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": 0.90
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'DC', 'Verifying reason code');
        }
    }));

}());
