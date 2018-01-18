
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

    QUnit.test('missing fusion data for one provider, return random available provider', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('missing radar rtt, return random provider', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying setReasonCode');
            }
        })();
    });


    QUnit.test('radar data Ok, fusion fails all providers, return default provider', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
                assert.equal(i.response.setReasonCode.args[0][0], 'GA', 'Verifying setReasonCode');
            }
        })();
    });


    QUnit.test('select only available provider regardless of rtt', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 0
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })

                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            }
        })();
    });


    QUnit.test('all providers available and healthy, select fastest rtt', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fusion availability fails for fastest provider, select next fastest rtt', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 0
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test fusion health scores not required, return best rtt', function(assert) {
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
                    .withArgs('sonar')
                    .returns({});
            },
            verify: function(i) {
                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
            }
        })();
    });

   QUnit.test('missing fusion data but flag says OK, return available provider with best rtt', function(assert) {
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
                   .withArgs('sonar')
                   .returns({
                       "foo": JSON.stringify({
                           "avail": 1
                       }),
                       "bar": JSON.stringify({
                           "avail": 1
                       })
                   });
           },
           verify: function(i) {
               assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
               assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
               assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
               assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
           }
       })();
   });

}());
