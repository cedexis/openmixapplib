
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
        default_provider: 'foo',
        default_ttl: 20,
        min_valid_rtt_score: 5,
        no_health_score_ok: false
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

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    QUnit.test('fusion custom data not required, return best rtt', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: false,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 190
                        },
                        "bar": {
                            "http_rtt": 190
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({});
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fusion data not required, do not select provider with bad fusion data', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: false,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 50
                        },
                        "bar": {
                            "http_rtt": 160
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fusion data good for 2 providers, return best candidate', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: true,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 180
                        },
                        "bar": {
                            "http_rtt": 160
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 70,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "bar": JSON.stringify({
                            "loadpercentage": 60,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "baz": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('bad fusion health scores for all providers, return default provider', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: true,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 190
                        },
                        "bar": {
                            "http_rtt": 190
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "bar": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "baz": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'EA', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fusion data bad for provider with fastest rtt, select next best provider with good fusion data', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: true,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 180
                        },
                        "bar": {
                            "http_rtt": 190
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 70,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "bar": JSON.stringify({
                            "loadpercentage": 60,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "baz": JSON.stringify({
                            "loadpercentage": 100,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fusion data required for all providers, select provider with best health score', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: true,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 180
                        },
                        "bar": {
                            "http_rtt": 190
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 70,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "bar": JSON.stringify({
                            "loadpercentage": 60,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('radar_rtt_not_robust reason code set when missing provider rtt scores', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: false,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 180
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns({
                        "foo": JSON.stringify({
                            "loadpercentage": 70,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        }),
                        "bar": JSON.stringify({
                            "loadpercentage": 90,
                            "unixTime": 1414433762,
                            "date": "2014-10-27T19:16:02.8706589+01:00",
                            "DCID": "EQX"
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'G', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('bad fusion data, fusion data error and default provider', function(assert) {
        test_handle_request({
            settings: {
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
                default_provider: 'foo',
                default_ttl: 20,
                min_valid_rtt_score: 5,
                fusion_data_required: false,
                failed_health_score: 1
            },
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        "foo": {
                            "http_rtt": 190
                        },
                        "bar": {
                            "http_rtt": 190
                        },
                        "baz": {
                            "http_rtt": 100
                        }
                    });
                i.request
                    .getData
                    .withArgs('fusion')
                    .returns("+++ this is bad fusion data +++");
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
            }
        })();
    });

}());
