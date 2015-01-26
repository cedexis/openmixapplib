
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'provider1': {
                cname: 'cname1.foo.com',
                weight: 50
            },
            'provider2': {
                cname: 'cname2.foo.com',
                weight: 30
            },
            'provider3': {
                cname: 'cname3.foo.com',
                weight: 20
            }
        },

        // The DNS TTL to be applied to DNS responses in seconds.
        default_ttl: 20,
        availability_threshold: 90
    };

    module('do_init');

    function test_do_init(i) {
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

    test('default', test_do_init({
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[2][0], 'provider1', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'provider2', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'provider3', 'Verirying provider alias');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: this.stub(),
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

    test('routed_randomly_by_weight', test_handle_request({
        settings: {
            providers: {
                'provider1': {
                    cname: 'cname1.foo.com',
                    weight: 50
                },
                'provider2': {
                    cname: 'cname2.foo.com',
                    weight: 30
                },
                'provider3': {
                    cname: 'cname3.foo.com',
                    weight: 20
                }
            },
            // The DNS TTL to be applied to DNS responses in seconds.
            default_ttl: 20,
            availability_threshold: 90
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 95 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 100 }
                });
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider3', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname3.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('only_one_provider_avail', test_handle_request({
        settings: {
            providers: {
                'provider1': {
                    cname: 'cname1.foo.com',
                    weight: 50
                },
                'provider2': {
                    cname: 'cname2.foo.com',
                    weight: 30
                },
                'provider3': {
                    cname: 'cname3.foo.com',
                    weight: 20
                }
            },
            // The DNS TTL to be applied to DNS responses in seconds.
            default_ttl: 20,
            availability_threshold: 90
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 75 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 70 }
                });
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider2', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname2.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('most_available_platform_chosen', test_handle_request({
        settings: {
            providers: {
                'provider1': {
                    cname: 'cname1.foo.com',
                    weight: 0
                },
                'provider2': {
                    cname: 'cname2.foo.com',
                    weight: 0
                },
                'provider3': {
                    cname: 'cname3.foo.com',
                    weight: 0
                }
            },
            // The DNS TTL to be applied to DNS responses in seconds.
            default_ttl: 20,
            availability_threshold: 90
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 100 },
                    'provider2': { avail: 95 },
                    'provider3': { avail: 98 }
                });
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname1.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('none_available', test_handle_request({
        settings: {
            providers: {
                'provider1': {
                    cname: 'cname1.foo.com',
                    weight: 50
                },
                'provider2': {
                    cname: 'cname2.foo.com',
                    weight: 30
                },
                'provider3': {
                    cname: 'cname3.foo.com',
                    weight: 20
                }
            },
            // The DNS TTL to be applied to DNS responses in seconds.
            default_ttl: 20,
            availability_threshold: 90
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 75 },
                    'provider2': { avail: 70 },
                    'provider3': { avail: 60 }
                });
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname1.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('data_problem', test_handle_request({
        settings: {
            providers: {
                'provider1': {
                    cname: 'cname1.foo.com',
                    weight: 50
                },
                'provider2': {
                    cname: 'cname2.foo.com',
                    weight: 30
                },
                'provider3': {
                    cname: 'cname3.foo.com',
                    weight: 20
                }
            },
            // The DNS TTL to be applied to DNS responses in seconds.
            default_ttl: 20,
            availability_threshold: 90
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider3', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname3.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

}());
