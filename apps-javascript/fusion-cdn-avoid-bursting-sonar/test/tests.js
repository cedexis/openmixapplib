
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'www.foo.com',
                base_padding: 0
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
                usage: [
                    { threshold: 20000, multiplier: 1.2 },
                    { threshold: 25000, multiplier: 1.3 },
                    { threshold: 30000, multiplier: 1.5 }
                ],
                bandwidth: [
                    { threshold: 5000, multiplier: 1.2 },
                    { threshold: 7500, multiplier: 1.3 },
                    { threshold: 10000, multiplier: 1.5 }
                ]
            },
            'bar': {
                usage: [
                    { threshold: 20000, multiplier: 1.2 },
                    { threshold: 25000, multiplier: 1.3 },
                    { threshold: 30000, multiplier: 1.5 }
                ],
                bandwidth: [
                    { threshold: 5000, multiplier: 1.2 },
                    { threshold: 7500, multiplier: 1.3 },
                    { threshold: 10000, multiplier: 1.5 }
                ]
            }
        },
        default_ttl: 20,
        error_ttl: 20,
        min_valid_rtt_score: 5,
        availability_threshold: 90,
        //set it true if you want to filter the candidates by avail techniques, otherwise set it to false
        //both options can be set to true or false.
        use_radar_avail: true,
        use_sonar_avail: true
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 1
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
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

    QUnit.test('foo faster; bar fastest after padding, no usage', function(assert) {
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
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 1
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'H,A', 'Verifying setReasonCode');
            }
        })();
    });


    QUnit.test('foo faster; no bandwith and usage', function(assert) {
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
                        }),
                        "bar": JSON.stringify({
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 1
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,H,A', 'Verifying setReasonCode');
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
                i.request
                    .getData
                    .onCall(1)
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
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
                i.request
                    .getData
                    .onCall(1)
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('missing fusion data', function(assert) {
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
                            "http_rtt": 222
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({});
                i.request
                    .getData
                    .onCall(1)
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
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
                i.request
                    .getData
                    .onCall(1)
                    .returns({});
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('all providers eliminated sonar avail', function(assert) {
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 0
                        }),
                        'bar': JSON.stringify({
                            "avail": 0
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('all providers eliminated sonar and radar avail', function(assert) {
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
                            "avail": 75
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 0
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('one provider avail', function(assert) {
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 0
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('sonar avail BRB case', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        base_padding: 0
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
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    },
                    'bar': {
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    }
                },
                default_ttl: 20,
                error_ttl: 20,
                min_valid_rtt_score: 5,
                availability_threshold: 90,
                //set it true if you want to filter the candidates by avail techniques, otherwise set it to false
                //both options can be set to true or false.
                use_radar_avail: false,
                use_sonar_avail: true
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 93
                        },
                        "bar": {
                            "avail": 99
                        },
                        "baz": {
                            "avail": 95
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 1
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
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

    QUnit.test('radar avail disabled', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        base_padding: 0
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
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    },
                    'bar': {
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    }
                },
                default_ttl: 20,
                error_ttl: 20,
                min_valid_rtt_score: 5,
                availability_threshold: 90,
                //set it true if you want to filter the candidates by avail techniques, otherwise set it to false
                //both options can be set to true or false.
                use_radar_avail: false,
                use_sonar_avail: true
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 60
                        },
                        "bar": {
                            "avail": 75
                        },
                        "baz": {
                            "avail": 40
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 1
                        }),
                        'bar': JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
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

    QUnit.test('sonar avail disabled', function(assert) {
        test_handle_request({
            settings: {
                providers: {
                    'foo': {
                        cname: 'www.foo.com',
                        base_padding: 0
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
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    },
                    'bar': {
                        usage: [
                            { threshold: 20000, multiplier: 1.2 },
                            { threshold: 25000, multiplier: 1.3 },
                            { threshold: 30000, multiplier: 1.5 }
                        ],
                        bandwidth: [
                            { threshold: 5000, multiplier: 1.2 },
                            { threshold: 7500, multiplier: 1.3 },
                            { threshold: 10000, multiplier: 1.5 }
                        ]
                    }
                },
                default_ttl: 20,
                error_ttl: 20,
                min_valid_rtt_score: 5,
                availability_threshold: 90,
                //set it true if you want to filter the candidates by avail techniques, otherwise set it to false
                //both options can be set to true or false.
                use_radar_avail: true,
                use_sonar_avail: false
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 96
                        },
                        "bar": {
                            "avail": 99
                        },
                        "baz": {
                            "avail": 97
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
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        }),
                        "bar": JSON.stringify({
                            "bandwidth": {
                                "unit": "Mbps",
                                "value": "5001.31"
                            },
                            "usage": {
                                "unit": "GB",
                                "value": "6.64"
                            }
                        })
                    });
                i.request
                    .getData
                    .onCall(1)
                    .returns({
                        'foo': JSON.stringify({
                            "avail": 0
                        }),
                        'bar': JSON.stringify({
                            "avail": 0
                        })
                    });
                Math.random.returns(0.9);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 2, 'Verifying getData call count');
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


}());
