
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'foo': {
                cname: 'cn.foo.net'
            },
            'bar': {
                cname: 'cn.bar.net'
            },
            'baz': {
                cname: 'cn.baz.net'
            }
        },
        geo_order: ['asn', 'state', 'region', 'country', 'market'],
        use_radar_availability_threshold: true,
        use_sonar_availability_threshold: true,
        default_settings: {
            providers: {
                'foo': {
                    cname: 'cn.foo.net',
                    kbps_padding: 0,
                    rtt_padding: 0
                },
                'bar': {
                    cname: 'cn.bar.net',
                    kbps_padding: 0,
                    rtt_padding: 0
                }
            },
            default_ttl: 240,
            radar_availability_threshold: 95,
            min_rtt: 5,
            rtt_tp_mix: 0.95
        },
        geo_settings: {
            state:{
                'US-S-AR': { // Example of Arizona Settings.
                    providers: {
                        'foo': {
                            cname: 'az.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'az.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 80,
                    rtt_tp_mix: 0.05
                },
                'a1': {
                    providers: {
                        'foo': {
                            cname: 'az.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'az.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 80,
                    rtt_tp_mix: 0.05
                }
            },
            region: {
                'b1': {
                    providers: {
                        'foo': {
                            cname: 'az.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'az.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 80,
                    rtt_tp_mix: 0.05
                }
            },
            country: {
                'CN': { //Example of China Settings.
                    providers: {
                        'foo': {
                            cname: 'cn.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 240,
                    radar_availability_threshold: 90,
                    rtt_tp_mix: 0.60,
                    fallbackBehavior: {
                        providers: {
                            'baz': {
                                cname: 'cn.baz.net',
                                kbps_padding: 0,
                                rtt_padding: 0
                            },
                            'bar': {
                                cname: 'cn.bar.net',
                                kbps_padding: 0,
                                rtt_padding: 0
                            }
                        },
                        default_ttl: 20,
                        radar_availability_threshold: 85,
                        rtt_tp_mix: 0.25
                    }
                },
                'c1': {
                    providers: {
                        'foo': {
                            cname: 'az.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'az.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 80,
                    rtt_tp_mix: 0.05
                }
            },
            market: {
                'd1': {
                    providers: {
                        'foo': {
                            cname: 'az.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'az.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        }
                    },
                    default_ttl: 20,
                    radar_availability_threshold: 80,
                    rtt_tp_mix: 0.05
                }
            },
            asn: {
                '7922': { //Example of Comcast ASN Settings.
                    providers: {
                        'foo': {
                            cname: 'cn.foo.net',
                            kbps_padding: 5,
                            rtt_padding: 10
                        },
                        'baz': {
                            cname: 'cn.baz.net',
                            kbps_padding: 5,
                            rtt_padding: 100
                        }
                    },
                    default_ttl: 240,
                    radar_availability_threshold: 90,
                    rtt_tp_mix: 0.60,
                    fallbackBehavior: {
                        providers: {
                            'baz': {
                                cname: 'cn.baz.net',
                                kbps_padding: 0,
                                rtt_padding: 0
                            },
                            'foo': {
                                cname: 'cn.foo.net',
                                kbps_padding: 0,
                                rtt_padding: 0
                            }
                        },
                        default_ttl: 20,
                        radar_availability_threshold: 85,
                        rtt_tp_mix: 0.25
                    }
                }
            }
        }
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
                assert.equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying failover provider alias');
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

            var random = sinon.stub(Math,"random");

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
            random.restore();
        };
    }

    QUnit.test('test 1 optimum_server_chosen', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getData call count');
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('optimum_server_chosen_No_KBPS', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({});
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getData call count');
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 2 geo_override_on_state', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a1';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'az.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 3 geo_override_on_region', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b1';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'az.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 4 geo_override_on_country', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c1';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'az.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 5 geo_override_on_market', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd1';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'az.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'E,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 6 asn_override', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
                    });
                i.request
                    .getData
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avails": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
                i.request.asn = 7922;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'F,A', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 7 all_providers_eliminated_radar', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 80 },
                        'bar': { avail: 81 },
                        'baz': { avail: 80 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,G', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 8 all_providers_eliminated_sonar', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 99 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,H', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 9 only_one_provider_avail', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.foo.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,J', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('test 10 data_problem', function(assert) {
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
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 240, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'I,K', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fallbackBehavior used best score chosen', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 60 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
                i.request.country = 'CN';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getData call count');
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D,G,L,A', 'Verifying setReasonCode');
            }
        })();
    });


    QUnit.test('fallbackBehavior none avail choose highest avail', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 40 },
                        'bar': { avail: 50 },
                        'baz': { avail: 60 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.country = 'CN';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getData call count');
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.baz.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D,G,L,G', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('fallbackBehavior used only one provider avail', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 60 },
                        'bar': { avail: 100 },
                        'baz': { avail: 30 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 60 },
                        'bar': { http_rtt: 85 },
                        'baz': { http_rtt: 90 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                            "avail": 1
                        })
                    });
                Math.random.returns(0.9);
                i.request.country = 'CN';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getProbe.callCount, 3, 'Verifying getData call count');
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D,G,L,J', 'Verifying setReasonCode');
            }
        })();
    });

    QUnit.test('geo_override_on_country data problem fallback behaviour RR', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request
                    .getProbe
                    .withArgs('avail')
                    .returns({
                        'foo': { avail: 100 },
                        'bar': { avail: 100 },
                        'baz': { avail: 100 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_rtt')
                    .returns({
                        'foo': { http_rtt: 1 },
                        'bar': { http_rtt: 1 },
                        'baz': { http_rtt: 1 }
                    });
                i.request
                    .getProbe
                    .withArgs('http_kbps')
                    .returns({
                        'foo': { http_kbps: 60 },
                        'bar': { http_kbps: 85 },
                        'baz': { http_kbps: 90 }
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
                Math.random.returns(0.9);
                i.request.asn = 123;
                i.request.state = 'a';
                i.request.region = 'b';
                i.request.country = 'c1';
                i.request.market = 'd';
            },
            verify: function(i) {
                assert.equal(i.request.getData.callCount, 1, 'Verifying getData call count');
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
                assert.equal(i.response.respond.args[0][1], 'cn.bar.net', 'Verifying respond CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'D,K', 'Verifying setReasonCode');
            }
        })();
    });

}());
