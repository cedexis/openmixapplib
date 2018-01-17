
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com',
                base_padding: 50
            },
            'bar': {
                cname: 'www.bar.com',
                base_padding: 0
            },
            'baz': {
                cname: 'www.baz.com',
                base_padding: 0
            }
        },
        burstable_cdns: {
            'foo': {
                bandwidth: [
                    { threshold: 10000, multiplier: 1.2 },
                    { threshold: 7500, multiplier: 1.3 },
                    { threshold: 5000, multiplier: 1.5 }
                ]
            },
            'bar': {
                bandwidth: [
                    { threshold: 10000, multiplier: 1.2 },
                    { threshold: 7500, multiplier: 1.3 },
                    { threshold: 5000, multiplier: 1.5 }
                ]
            }
        },
        default_ttl: 20,
        error_ttl: 10,
        min_valid_rtt_score: 5,
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
                assert.equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
                assert.equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
                assert.equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
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

            var random = sinon.stub(Math, 'random');

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
            random.restore();
        };
    }

    QUnit.test('foo faster; bar fastest after padding', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 200
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {
                            "http_rtt": 220
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            }
                        })
                    });
                Math.random.returns(0);
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

    QUnit.test('baz fastest after padding', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 155
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {
                            "http_rtt": 220
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "6112.31"
                            }
                        })
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('foo fastest available', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 90
                        },
                        "bar": {
                            "avail": 89
                        },
                        "baz": {
                            "avail": 90
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 200
                        },
                        "bar": {
                            "http_rtt": 100
                        },
                        "baz": {
                            "http_rtt": 300
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "6112.31"
                            }
                        })
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('missing avail data for foo', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {},
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 155
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {
                            "http_rtt": 220
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "6112.31"
                            }
                        })
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('missing rtt data for baz', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 155
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {}
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "6112.31"
                            }
                        })
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('invalid rtt score for baz', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 155
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {
                            "http_rtt": 4
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "6112.31"
                            }
                        })
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('missing fusion data for bar', function(assert) {
        test_handle_request({
            setup: function(i) {
                console.log(i);
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 100
                        },
                        "bar": {
                            "avail": 100
                        },
                        "baz": {
                            "avail": 100
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 200
                        },
                        "bar": {
                            "http_rtt": 200
                        },
                        "baz": {
                            "http_rtt": 200
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        "foo": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "8623.57"
                            }
                        }),
                        "bar": ""
                    });
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
            }
        })();
    });

}());
