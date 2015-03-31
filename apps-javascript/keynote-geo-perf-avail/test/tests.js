
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
        max_perf_threshold: 15, // keynote rtt in seconds
        min_availability_threshold: 90
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
                    getProbe: this.stub(),
                    country: i.country || 'US',
                    market: i.market || 'NA'
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);
            sut.do_init(config);

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

    test('return provider with best keynote performance measurement', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "1.5",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "1.5",
                                "avail_data": "100"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "9.701",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "9.701",
                                "avail_data": "100"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode, best performing provider');
        }
    }));

    test('no providers with requestor geo location, select default provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "1.5",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "1.5",
                                "avail_data": "100"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "9.701",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "9.701",
                                "avail_data": "100"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'DA', 'Verifying setReasonCode, default provider');
        }
    }));

    test('no providers with requestor country location, select provider best market performance', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "CA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "CA": {
                                "perf_data": "1.5",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "9.0",
                                "avail_data": "100"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "CA": {
                                "perf_data": "9.701",
                                "avail_data": "100"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "2.5",
                                "avail_data": "100"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'GC', 'Verifying setReasonCode, default provider');
        }
    }));

    test('test one acceptable country provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "1.5",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "9.0",
                                "avail_data": "100"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "9.701",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "2.5",
                                "avail_data": "100"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode, one acceptable provider');
        }
    }));

test('test one acceptable market provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'GB', 'Verifying setReasonCode, one acceptable provider');
        }
    }));

    test('test keynote data not robust', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode, default provider');
        }
    }));

    test('test keynote data not robust and random provider selected', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "CA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "CA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5.5",
                                "avail_data": "97.85"
                            }
                        }

                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'FE', 'Verifying setReasonCode, default provider');
        }
    }));

    test('test no fusion data returns default provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({});
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'DA', 'Verifying setReasonCode, default provider');
        }
    }));

    test('test availability good, performance bad, select default provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "20",
                                "avail_data": "97.85"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "20",
                                "avail_data": "97.85"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "20",
                                "avail_data": "100"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "20",
                                "avail_data": "50"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "20",
                                "avail_data": "100"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'DA', 'Verifying setReasonCode, default provider');
        }
    }));

test('test performance good, availability bad, select default provider', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "countries": {
                            "US": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        },
                        "markets": {
                            "NA": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        }

                    }),
                    "bar": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        }
                    }),
                    "baz": JSON.stringify({
                        "countries": {
                            "FR": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        },
                        "markets": {
                            "EU": {
                                "perf_data": "5",
                                "avail_data": "80"
                            }
                        }
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'DA', 'Verifying setReasonCode, default provider');
        }
    }));

}());
