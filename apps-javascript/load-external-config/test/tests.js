
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
        fusion_provider: 'foo',
        availability_threshold: 90,
        min_valid_rtt_score: 5,
        default_ttl: 20,
        error_ttl: 10
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

    QUnit.test('all are available and cdn1 is fastest', function(assert) {
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
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 203
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('all are available and cdn2 is fastest', function(assert) {
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
                            "http_rtt": 202
                        },
                        "bar": {
                            "http_rtt": 201
                        },
                        "baz": {
                            "http_rtt": 202
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'wpc.50C7.cdn2.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('all are available and cdn3 is fastest', function(assert) {
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
                            "http_rtt": 202
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 171
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'foo.edgesuite.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('cdn1 excluded due to availability, cdn2 next fastest despite penalty', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 79
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
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 203
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site2';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'wpc.50A2.cdn2.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('none available, choose least bad', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({
                        "foo": {
                            "avail": 79
                        },
                        "bar": {
                            "avail": 69
                        },
                        "baz": {
                            "avail": 59
                        }
                    });
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 202
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('Data problems', function(assert) {
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
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 202
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({ foo: "" });
                i.request.hostname_prefix = 'site1';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A,C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('Data problems 2', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .onCall(0)
                    .returns({});
                i.request
                    .getProbe
                    .onCall(1)
                    .returns({
                        "foo": {
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 202
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('Data problems 3', function(assert) {
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
                    .returns({});
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site1';
                Math.random.returns(0);
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('site not listed in config, skip to fallback', function(assert) {
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
                            "http_rtt": 201
                        },
                        "bar": {
                            "http_rtt": 202
                        },
                        "baz": {
                            "http_rtt": 202
                        }
                    });
                i.request
                    .getData
                    .onCall(0)
                    .returns({
                        foo: "#customer,foo,bar,baz\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net"
                    });
                i.request.hostname_prefix = 'site4';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A,C', 'Verifying setReasonCode');
            }
        })();
    });

}());
