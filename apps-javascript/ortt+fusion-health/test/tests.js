/*global
    module,
    test,
    equal,
    deepEqual,
    OpenmixApplication,
    init,
    onRequest,
    console,
*/

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
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
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
                    getData: this.stub(),
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
            };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('missing fusion data for one provider, return random available provider', test_handle_request({
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
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

  test('missing radar rtt, return random provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
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
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "baz": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
        }
    }));


    test('radar data Ok, fusion fails all providers, return default provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 200
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
                        "health_score": {
                            "unit": "0-5",
                            "value": "0"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "0"
                        }
                    }),
                    "baz": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "0"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'GA', 'Verifying setReasonCode');
        }
    }));

    
    test('select only available provider regardless of rtt', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 155
                    },
                    "bar": {
                        "http_rtt": 100
                    },
                    "baz": {
                        "http_rtt": 160
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "0"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "baz": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "0"
                        }
                    })

                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
        }
    }));


    test('all providers available and healthy, select fastest rtt', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 200
                    },
                    "bar": {
                        "http_rtt": 100
                    },
                    "baz": {
                        "http_rtt": 89
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "baz": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

    test('fusion availability fails for fastest provider, select next fastest rtt', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 150
                    },
                    "bar": {
                        "http_rtt": 100
                    },
                    "baz": {
                        "http_rtt": 200
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "2"
                        }
                    }),
                    "baz": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

test('test fusion health scores not required, return best rtt', test_handle_request({
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
            no_health_score_ok: true
        },
        setup: function(i) {
            i.request.no_health_score_ok = true;
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 150
                    },
                    "bar": {
                        "http_rtt": 100
                    },
                    "baz": {
                        "http_rtt": 120
                    }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({});
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

   test('missing fusion data but flag says OK, return available provider with best rtt', test_handle_request({
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
            no_health_score_ok: true
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
                        "http_rtt": 170
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
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    }),
                    "bar": JSON.stringify({
                        "health_score": {
                            "unit": "0-5",
                            "value": "5"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

}());
