
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname:'www.foo.com',
                rank:0
            },
            'bar': {
                cname: 'www.bar.com',
                rank:0
            },
            'baz': {
                cname: 'www.baz.com',
                rank:0
            },
            'qux': {
                cname: 'www.qux.com',
                rank:0
            }
        },

        availability_threshold: 90
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
            equal(i.config.requireProvider.callCount, 4);
            equal(i.config.requireProvider.args[3][0], 'foo');
            equal(i.config.requireProvider.args[2][0], 'bar');
            equal(i.config.requireProvider.args[1][0], 'baz');
            equal(i.config.requireProvider.args[0][0], 'qux');
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
                    setHeader: this.stub(),
                    setReasonCode: this.stub(),
                    addProviderHost: this.stub(),
                    setStatus: this.stub()
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

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('best_performing_provider', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 95 },
                    'bar': { avail: 0 },
                    'baz': { avail: 100 },
                    'qux': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 85 },
                    'bar': { http_rtt: 60 },
                    'baz': { http_rtt: 50 },
                    'qux': { http_rtt: 70 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 3, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'www.baz.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'www.qux.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'foo', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'www.foo.com', 'Verifying Provider CNAME 3');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('best_performing_provider_only_one_avail', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 10 },
                    'bar': { avail: 0 },
                    'baz': { avail: 40 },
                    'qux': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 85 },
                    'bar': { http_rtt: 60 },
                    'baz': { http_rtt: 50 },
                    'qux': { http_rtt: 70 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 1, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'www.qux.com', 'Verifying Provider CNAME 1');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('all_providers_eliminated', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 60 },
                    'bar': { avail: 0 },
                    'baz': { avail: 40 },
                    'qux': { avail: 65 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 85 },
                    'bar': { http_rtt: 60 },
                    'baz': { http_rtt: 50 },
                    'qux': { http_rtt: 50 }
                });
            i.request
                .getProbe
                .onCall(2)
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'www.qux.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'foo', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'www.foo.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'www.baz.com', 'Verifying Provider CNAME 3');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('data_problem_avail_1', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            i.request
                .getProbe
                .onCall(1)
                .returns({});
            Math.random.returns(0.1);
        },

        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'www.foo.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'www.qux.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'www.baz.com', 'Verifying Provider CNAME 3');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('data_problem_avail_2', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 85 },
                    'bar': { http_rtt: 60 },
                    'baz': { http_rtt: 60 },
                    'qux': { http_rtt: 80 }
                });
            Math.random.returns(0.5);
        },

        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'www.baz.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'bar', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'www.bar.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'qux', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'www.qux.com', 'Verifying Provider CNAME 3');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

}());
