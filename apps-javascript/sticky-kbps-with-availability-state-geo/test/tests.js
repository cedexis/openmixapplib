
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com'
            },
            'bar': {
                cname: 'www.bar.com',
                asns: [123]
            },
            'baz': {
                cname: 'www.baz.com'
            }
        },
        default_provider: 'foo',
        country_availability_thresholds: {
            US: 90,
            CN: 80
        },
        sticky_countries: [],
        default_ttl: 30,
        error_ttl: 20,
        availability_threshold: 60,
        throughput_threshold: 500,
        maxSavedProviders: 800,
        asn_to_provider: { 1111: 'bar' },
        state_override: {'US-S-NY':'baz'}
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

    module('handle_request', {
        setup: function() {
            sinon.clock.now = 0;
        }
    });

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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 98 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo');
            sinon.clock.now = 1416513547123;
        },
        verify: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 98 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('test 3 -previous_below_availability_threshold', test_handle_request({
        setup: function(i) {
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
                    foo: { http_kbps: 100 },
                    bar: { http_kbps: 98 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('test 4 -new_provider_better', test_handle_request({
        setup: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 1000 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 100 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 60 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'bar');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying reason code');
        }
    }));
    
    test('test 7 -sparse_kbps', test_handle_request({
        setup: function(i) {
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
                .returns({});
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying reason code');
        }
    }));
    
    test('test 8 -sparse_kbps', test_handle_request({
        setup: function(i) {
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
                .returns({});
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo2');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying reason code');
        }
    }));
    
    test('test 9 -previous_missing_kbps', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    foo: { avail: 70 },
                    bar: { avail: 100 },
                    baz: { avail: 80 },
                    foo2: { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 100 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 123;
            i.sut.cache.set('EG-NA-123', 'foo2');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'H', 'Verifying reason code');
        }
    }));
    
    test('test 10 -asn_override', test_handle_request({
        setup: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 100 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.asn = 1111;
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'I', 'Verifying reason code');
        }
    }));

    test('test 11 -state_override', test_handle_request({
        setup: function(i) {
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
                    foo: { http_kbps: 90 },
                    bar: { http_kbps: 100 },
                    baz: { http_kbps: 96 }
                });
            i.request.market = 'EG';
            i.request.country = 'NA';
            i.request.state = 'US-S-NY';
            i.sut.cache.set('EG-NA-123', 'foo');
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 30, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'M', 'Verifying reason code');
        }
    }));
    
}());