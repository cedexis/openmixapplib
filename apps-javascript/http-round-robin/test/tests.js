
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
                assert.equal(i.config.requireProvider.callCount, 4);
                assert.equal(i.config.requireProvider.args[3][0], 'foo');
                assert.equal(i.config.requireProvider.args[2][0], 'bar');
                assert.equal(i.config.requireProvider.args[1][0], 'baz');
                assert.equal(i.config.requireProvider.args[0][0], 'qux');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: sinon.stub()
                },
                request = {
                    getProbe: sinon.stub(),
                    getData: sinon.stub()
                },
                response = {
                    setHeader: sinon.stub(),
                    setReasonCode: sinon.stub(),
                    addProviderHost: sinon.stub(),
                    setStatus: sinon.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);
            sut.do_init(config);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
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

    QUnit.test('routed_by_weight_1', function(assert) {
        test_handle_request({
            setup: function(i) {
                Math.random.returns(0);
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'qux.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'baz', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'baz.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'bar', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'bar.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.addProviderHost.args[3][0], 'foo', 'Verifying Provider Alias 4');
                assert.equal(i.response.addProviderHost.args[3][1], 'foo.com', 'Verifying Provider CNAME 4');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('routed_by_weight_2', function(assert) {
        test_handle_request({
            setup: function(i) {
                Math.random.returns(0.2);
            },
            verify: function(i) {
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'baz.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'qux.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'bar', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'bar.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.addProviderHost.args[3][0], 'foo', 'Verifying Provider Alias 4');
                assert.equal(i.response.addProviderHost.args[3][1], 'foo.com', 'Verifying Provider CNAME 4');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('routed_by_weight_3', function(assert) {
        test_handle_request({
            setup: function(i) {
                Math.random.returns(0.5);
            },
            verify: function(i) {
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'bar', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'bar.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'baz', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'baz.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'foo', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'foo.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.addProviderHost.args[3][0], 'qux', 'Verifying Provider Alias 4');
                assert.equal(i.response.addProviderHost.args[3][1], 'qux.com', 'Verifying Provider CNAME 4');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('routed_by_weight_5', function(assert) {
        test_handle_request({
            setup: function(i) {
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'foo.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'bar', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'bar.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'baz.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.addProviderHost.args[3][0], 'qux', 'Verifying Provider Alias 4');
                assert.equal(i.response.addProviderHost.args[3][1], 'qux.com', 'Verifying Provider CNAME 4');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('routed_by_weight_6', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 1, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'baz.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('data_problem', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'foo.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'qux.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'baz.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.addProviderHost.args[3][0], 'bar', 'Verifying Provider Alias 4');
                assert.equal(i.response.addProviderHost.args[3][1], 'bar.com', 'Verifying Provider CNAME 4');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

}());
