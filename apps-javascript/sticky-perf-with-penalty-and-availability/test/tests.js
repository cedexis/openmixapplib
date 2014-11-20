
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
            equal(i.config.requireProvider.callCount, 3);
            equal(i.config.requireProvider.args[2][0], 'foo');
            equal(i.config.requireProvider.args[1][0], 'bar');
            equal(i.config.requireProvider.args[0][0], 'baz');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
                request = {
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
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

    test('test 1 -best_performing provider equal previous only foo available', test_handle_request({
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
            i.sut.saved['EG-NA-123'] = { 'provider': 'foo', 'timestamp': 1 };
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('test 2 -no_previous', test_handle_request({
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
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('test 3 -previous_below_availability_threshold', test_handle_request({
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
            i.sut.saved['EG-NA-123'] = { 'provider': 'foo', 'timestamp': 1 };
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('test 4 -new_provider_below_varianceThreshold', test_handle_request({
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
            i.sut.saved['EG-NA-123'] = { 'provider': 'foo', 'timestamp': 1 };
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying reason code');
        }
    }));

    test('test 5 -choosing_previous', test_handle_request({
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
            i.sut.saved['EG-NA-123'] = { 'provider': 'foo', 'timestamp': 1 };
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
        }
    }));

    test('test 6 -all_providers_eliminated', test_handle_request({
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
            i.sut.saved['EG-NA-123'] = { 'provider': 'foo', 'timestamp': 1 };
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying reason code');
        }
    }));

    test('clean out this.saved', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname: 'www.foo.com',
                    padding:0
                },
                'bar': {
                    cname: 'www.bar.com',
                    padding:0
                }
            },
            availability_threshold: 60,
            default_provider: 'foo',
            default_ttl: 30,
            error_ttl: 20,
            sticky_countries: [],
            varianceThreshold: 0.65,
            maxSavedProviders: 10
        },
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    foo: { avail: 100 },
                    bar: { avail: 100 }
                });
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    foo: { http_rtt: 140 },
                    bar: { http_rtt: 98 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            var j = 12;
            while (j--) {
                i.sut.saved['EG-N' + j + '-123'] = { 'provider': 'foo', 'timestamp': j };
            }
            sinon.clock.tick(123);
        },
        verify: function(i) {
            console.log(i.sut.saved);
            equal(Object.keys(i.sut.saved).length, 10, 'Verifying count of saved object keys');
            deepEqual(i.sut.saved['EG-N3-123'],  { 'provider': 'foo', 'timestamp': 3 }, 'Verifying saved object #1');
            deepEqual(i.sut.saved['EG-N11-123'], { 'provider': 'foo', 'timestamp': 11 }, 'Verifying saved object #2');
            deepEqual(i.sut.saved['EG-NA-123'],  { 'provider': 'bar', 'timestamp': 123 }, 'Verifying saved object #3');
        }
    }));
}());
