
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com'
            },
            'bar': {
                cname: 'www.bar.com'
            }
        },
        failover_providers: {
            'foo_f': {
                cname: 'www.foo_f.com'
            },
            'bar_f': {
                cname: 'www.bar_f.com'
            }
        },
        default_provider: 'foo_f',
        default_ttl: 20
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
                assert.equal(i.config.requireProvider.callCount, 4, 'Verifying requireProvider call count');
                assert.equal(i.config.requireProvider.args[3][0], 'foo_f', 'Verirying failover provider alias');
                assert.equal(i.config.requireProvider.args[2][0], 'bar_f', 'Verirying failover provider alias');
                assert.equal(i.config.requireProvider.args[1][0], 'foo', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[0][0], 'bar', 'Verirying provider alias');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: sinon.stub(),
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

            var random = sinon.stub(Math,"random");

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
            random.restore();
        };
    }

    QUnit.test('test 1', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 2', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 3', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 4', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 5', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 6', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 0
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar_f', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar_f.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 7', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 0
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('Failover; alias reset', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "foo_f": JSON.stringify({
                            "avail": 1
                        }),
                        "bar_f": JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

}());
