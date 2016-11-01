
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'provider1': {
                cname: 'cname1.foo.com'
            },
            'provider2': {
                cname: 'cname2.foo.com'
            },
            'provider3': {
                cname: 'cname3.foo.com'
            }
        },

        // A mapping of ISO 3166-1 country codes to provider aliases
        //country_to_provider: { 'UK': 'bar', 'ES': 'baz' },
        country_to_provider: {
            'CN': 'provider1'
        },
        // A mapping of market codes to provider aliases
        //market_to_provider: { 'EG': 'foo' }
        market_to_provider: {},

        //% of times where you want to do the geo override, from 0 (0%) to 1 (100%)
        geo_override_percentage: 0.1, //10% of times will do geo_override, the 90% rest will do ORTT

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

    test('best_performing_provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 95 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 20 }
                });
            i.request.country = 'JP';
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider3', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname3.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('country_override', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 95 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 20 }
                });
            i.request.country = 'CN';
            Math.random.returns(0.05);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname1.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('not_country_override_due_to_geo_percentaje_do_ortt', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 95 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 20 }
                });
            i.request.country = 'CN';
            Math.random.returns(0.15);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider3', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname3.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('empty_dataRtt_choose_most_avail', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 95 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({});
            i.request.country = 'JP';
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider2', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname2.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('only_one_provider_avail', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 75 },
                    'provider2': { avail: 100 },
                    'provider3': { avail: 70 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 70 }
                });
            i.request.country = 'CN';
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'provider2', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'cname2.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));

    test('none_available', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'provider1': { avail: 75 },
                    'provider2': { avail: 70 },
                    'provider3': { avail: 60 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 70 }
                });
            i.request.country = 'CN';
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
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
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'provider1': { http_rtt: 30 },
                    'provider2': { http_rtt: 50 },
                    'provider3': { http_rtt: 70 }
                });
            i.request.country = 'CN';
            Math.random.returns(0.999);
        },
        verify: function(i) {
            equal(i.request.getProbe.callCount, 2, 'Verifying getData call count');
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
