
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname:'foo.com',
                weight: 20
            },
            'bar': {
                cname: 'bar.com',
                weight: 50
            },
            'baz': {
                cname: 'baz.com',
                weight: 10
            },
            'qux': {
                cname: 'qux.com',
                weight: 20
            }
        }
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

    test('routed_by_weight_1', test_handle_request({
        setup: function(i) {
            Math.random.returns(0);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'qux.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'baz', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'baz.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'bar', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'bar.com', 'Verifying Provider CNAME 3');
            equal(i.response.addProviderHost.args[3][0], 'foo', 'Verifying Provider Alias 4');
            equal(i.response.addProviderHost.args[3][1], 'foo.com', 'Verifying Provider CNAME 4');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('routed_by_weight_2', test_handle_request({
        setup: function(i) {
            Math.random.returns(0.2);
        },
        verify: function(i) {
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'baz.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'qux.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'bar', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'bar.com', 'Verifying Provider CNAME 3');
            equal(i.response.addProviderHost.args[3][0], 'foo', 'Verifying Provider Alias 4');
            equal(i.response.addProviderHost.args[3][1], 'foo.com', 'Verifying Provider CNAME 4');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('routed_by_weight_3', test_handle_request({
        setup: function(i) {
            Math.random.returns(0.5);
        },
        verify: function(i) {
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'bar', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'bar.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'baz', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'baz.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'foo', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'foo.com', 'Verifying Provider CNAME 3');
            equal(i.response.addProviderHost.args[3][0], 'qux', 'Verifying Provider Alias 4');
            equal(i.response.addProviderHost.args[3][1], 'qux.com', 'Verifying Provider CNAME 4');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('routed_by_weight_5', test_handle_request({
        setup: function(i) {
            Math.random.returns(0.9);
        },
        verify: function(i) {
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'foo.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'bar', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'bar.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'baz.com', 'Verifying Provider CNAME 3');
            equal(i.response.addProviderHost.args[3][0], 'qux', 'Verifying Provider Alias 4');
            equal(i.response.addProviderHost.args[3][1], 'qux.com', 'Verifying Provider CNAME 4');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('routed_by_weight_6', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname:'foo.com',
                    weight: 0
                },
                'bar': {
                    cname: 'bar.com',
                    weight: 0
                },
                'baz': {
                    cname: 'baz.com',
                    weight: 100
                },
                'qux': {
                    cname: 'qux.com',
                    weight: 0
                }
            }
        },
        setup: function(i) {
            Math.random.returns(0.9);
        },
        verify: function(i) {
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 1, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'baz.com', 'Verifying Provider CNAME 1');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('data_problem', test_handle_request({
        settings: {
            providers: {
                'foo': {
                    cname:'foo.com',
                    weight: 0
                },
                'bar': {
                    cname: 'bar.com',
                    weight: 0
                },
                'baz': {
                    cname: 'baz.com',
                    weight: 0
                },
                'qux': {
                    cname: 'qux.com',
                    weight: 0
                }
            }
        },
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            Math.random.returns(0.1);
        },

        verify: function(i) {
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

            equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
            equal(i.response.addProviderHost.args[0][1], 'foo.com', 'Verifying Provider CNAME 1');
            equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
            equal(i.response.addProviderHost.args[1][1], 'qux.com', 'Verifying Provider CNAME 2');
            equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
            equal(i.response.addProviderHost.args[2][1], 'baz.com', 'Verifying Provider CNAME 3');
            equal(i.response.addProviderHost.args[3][0], 'bar', 'Verifying Provider Alias 4');
            equal(i.response.addProviderHost.args[3][1], 'bar.com', 'Verifying Provider CNAME 4');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

}());
