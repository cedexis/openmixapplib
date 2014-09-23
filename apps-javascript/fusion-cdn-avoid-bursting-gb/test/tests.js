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
        providers: [
            {
                alias: 'foo',
                cname: 'www.foo.com',
                base_padding: 0
            },
            {
                alias: 'bar',
                cname: 'www.bar.com',
                base_padding: 0
            },
            {
                alias: 'baz',
                cname: 'www.baz.com'
            }
        ],
        burstable_cdns: {
            'foo': {
                gb: [
                    { threshold: 20000, multiplier: 1.2 },
                    { threshold: 25000, multiplier: 1.3 },
                    { threshold: 30000, multiplier: 1.5 }
                ]
            },
            'bar': {
                gb: [
                    { threshold: 20000, multiplier: 1.2 },
                    { threshold: 25000, multiplier: 1.3 },
                    { threshold: 30000, multiplier: 1.5 }
                ]
            }
        },
        default_ttl: 20,
        error_ttl: 10,
        min_valid_rtt_score: 5,
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
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[0][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
            equal(i.config.requireProvider.args[2][0], 'baz', 'Verirying provider alias');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
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
            this.stub(sut, 'get_random');

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

    test('foo faster; bar fastest after padding', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "31233.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('foo fastest after padding', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('foo fastest available', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('missing avail data for foo', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
            i.sut.get_random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('missing rtt data for baz', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
            i.sut.get_random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('invalid rtt score for baz', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": JSON.stringify({
                        "usage": {
                            "unit": "GB",
                            "value": "20501.89"
                        }
                    })
                });
            i.sut.get_random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

    test('missing fusion data for bar', test_handle_request({
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
                        "usage": {
                            "unit": "GB",
                            "value": "24999.41"
                        }
                    }),
                    "bar": ""
                });
            i.sut.get_random.returns(0);
        },
        verify: function(i) {
            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
        }
    }));

}());
