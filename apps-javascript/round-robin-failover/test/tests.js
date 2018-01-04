
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

    module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: this.stub()
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

    test('default', test_do_init({
        setup: function() { return; },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 4, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[3][0], 'foo_f', 'Verirying failover provider alias');
            equal(i.config.requireProvider.args[2][0], 'bar_f', 'Verirying failover provider alias');
            equal(i.config.requireProvider.args[1][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'bar', 'Verirying provider alias');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
                request = {
                    getData: this.stub(),
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff = {
                    instance: sut,
                    request: request,
                    response: response
                };
            
            this.stub(Math,"random");

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('test 1', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('test 2', test_handle_request({
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

    test('test 3', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('test 4', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('test 5', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('test 6', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar_f', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar_f.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('test 7', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

    test('Failover; alias reset', test_handle_request({
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
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo_f', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo_f.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

}());
