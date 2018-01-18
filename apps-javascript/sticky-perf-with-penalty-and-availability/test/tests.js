
(function() {
    'use strict';

    var default_settings = {
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
        availability_threshold: 60,
        default_provider: 'foo',
        default_ttl: 30,
        error_ttl: 20,
        sticky_countries: [],
        variance_threshold: 0.65,
        maxSavedProviders: 800
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: sinon.stub()
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

    QUnit.test('default', function(assert) {
        test_do_init({
            setup: function() {
                return;
            },
            verify: function(i) {
                assert.equal(i.config.requireProvider.callCount, 3);
                assert.equal(i.config.requireProvider.args[2][0], 'foo');
                assert.equal(i.config.requireProvider.args[1][0], 'bar');
                assert.equal(i.config.requireProvider.args[0][0], 'baz');
            }
        })();
    });

    QUnit.module('handle_request', {
        setup: function() {
            sinon.clock.now = 0;
        }
    });

    function test_handle_request(i) {
        return function() {
            var sut,
                request = {
                    getProbe: sinon.stub()
                },
                response = {
                    respond: sinon.stub(),
                    setTTL: sinon.stub(),
                    setReasonCode: sinon.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
            };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    QUnit.test('test 1 -best_performing provider equal previous only foo available', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 100 },
                        bar: { avail: 50 },
                        baz: { avail: 55 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 90 },
                        bar: { http_rtt: 98 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
                i.sut.cache.set('EG-NA-123', 'foo');
                sinon.clock.now = 1416513547123;
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test 2 -no_previous', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 100 },
                        bar: { avail: 100 },
                        baz: { avail: 100 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 90 }, //bestRTT
                        bar: { http_rtt: 98 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test 3 -previous_below_availability_threshold', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 50 },
                        bar: { avail: 100 },
                        baz: { avail: 100 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 100 },
                        bar: { http_rtt: 98 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
                i.sut.cache.set('EG-NA-123', 'foo');
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test 4 -new_provider_below_varianceThreshold', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 70 },
                        bar: { avail: 100 },
                        baz: { avail: 80 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 90 },
                        bar: { http_rtt: 10 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
                i.sut.cache.set('EG-NA-123', 'foo');
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test 5 -choosing_previous', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 70 },
                        bar: { avail: 100 },
                        baz: { avail: 80 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 90 },
                        bar: { http_rtt: 60 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
                i.sut.cache.set('EG-NA-123', 'foo');
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('test 6 -all_providers_eliminated', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        foo: { avail: 40 },
                        bar: { avail: 50 },
                        baz: { avail: 35 }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        foo: { http_rtt: 90 },
                        bar: { http_rtt: 60 },
                        baz: { http_rtt: 96 }
                    });
                i.request.market = 'EG';
                i.request.country = 'NA';
                i.request.asn = 123;
                i.sut.cache.set('EG-NA-123', 'bar');
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying reason code');
            }
        })();
    });
}());
