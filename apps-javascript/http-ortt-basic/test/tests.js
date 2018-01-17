
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

    QUnit.test('best_performing_provider', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 3, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'www.baz.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'www.qux.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'foo', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'www.foo.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('best_performing_provider_only_one_avail', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 1, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'www.qux.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('all_providers_eliminated', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'qux', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'www.qux.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'foo', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'www.foo.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'www.baz.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('data_problem_avail_1', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'foo', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'www.foo.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'qux', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'www.qux.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'baz', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'www.baz.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('data_problem_avail_2', function(assert) {
        test_handle_request({
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
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.addProviderHost.callCount, 4, 'Verifying addProviderHost call count');

                assert.equal(i.response.addProviderHost.args[0][0], 'baz', 'Verifying Provider Alias 1');
                assert.equal(i.response.addProviderHost.args[0][1], 'www.baz.com', 'Verifying Provider CNAME 1');
                assert.equal(i.response.addProviderHost.args[1][0], 'bar', 'Verifying Provider Alias 2');
                assert.equal(i.response.addProviderHost.args[1][1], 'www.bar.com', 'Verifying Provider CNAME 2');
                assert.equal(i.response.addProviderHost.args[2][0], 'qux', 'Verifying Provider Alias 3');
                assert.equal(i.response.addProviderHost.args[2][1], 'www.qux.com', 'Verifying Provider CNAME 3');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

}());
