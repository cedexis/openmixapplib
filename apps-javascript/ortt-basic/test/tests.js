
(function() {
    'use strict';

    var default_settings = {
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

        default_ttl: 20,
        availability_threshold: 90
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: sinon.stub()
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

    QUnit.test('default', function(assert) {
        test_do_init({
            setup: function() { return; },
            verify: function(i) {
                assert.equal(i.config.requireProvider.callCount, 3);
                assert.equal(i.config.requireProvider.args[2][0], 'foo');
                assert.equal(i.config.requireProvider.args[1][0], 'bar');
                assert.equal(i.config.requireProvider.args[0][0], 'baz');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getProbe: sinon.stub()
                },
                response = {
                    respond: sinon.stub(),
                    setTTL: sinon.stub(),
                    setReasonCode: sinon.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
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

    QUnit.test('best_performing', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        },
                        "edgecast": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 90
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 80
                        },
                        "edgecast": {
                            "avail": 95
                        }
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 2, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('all_providers_eliminated', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 83
                        },
                        "bar": {
                            "avail": 80
                        },
                        "baz": {
                            "avail": 82
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 90
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 80
                        }
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 2, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('data_problem_rtt', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        "foo": {
                            "avail": 83
                        },
                        "bar": {
                            "avail": 80
                        },
                        "baz": {
                            "avail": 82
                        },
                        "edgecast": {
                            "avail": 84
                        }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 2, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

    QUnit.test('data_problem_avail', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({});
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 90
                        },
                        "bar": {
                            "http_rtt": 70
                        },
                        "baz": {
                            "http_rtt": 80
                        }
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 2, 'Verifying getProbe call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });

}());
