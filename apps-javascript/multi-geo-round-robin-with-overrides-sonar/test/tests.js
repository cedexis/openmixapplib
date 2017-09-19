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
                },
                'origin': {
                    cname: 'www.origin.com'
                }
            },

            default_ttl: 20,
            country_to_provider_roundrobin: {
            'CN': ['bar','baz'],
            'JP': ['foo']
            },
            require_sonar_data: false
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
    test('basic', test_do_init({
        setup: function() {
            return;
        },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 4);
            equal(i.config.requireProvider.args[3][0], 'foo');
            equal(i.config.requireProvider.args[2][0], 'bar');
            equal(i.config.requireProvider.args[1][0], 'baz');
            equal(i.config.requireProvider.args[0][0], 'origin');
        }
    }));


    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings  || default_settings),
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

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }
    test('Test no data on geo + below sonar threshold', test_handle_request({
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
                    "baz": JSON.stringify({
						"avail": 0
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
        },
        verify: function(i) {
            
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'origin', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.origin.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
        }
    }));

    test('Test no data on geo', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
						"avail": 1
                    }),
                    "bar": JSON.stringify({
						"avail": 1
                    }),
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 1
                    })
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'origin', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.origin.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('Test no data on geo + 1 above sonar threshold', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
						"avail": 0
                    }),
                    "bar": JSON.stringify({
						"avail": 5
                    }),
                    "baz": JSON.stringify({
						"avail": 0
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
        },
        verify: function(i) {
     
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    })); 
    test('Test no data on geo + 2 above sonar threshold', test_handle_request({
        setup: function(i) {
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
						"avail": 1
                    }),
                    "bar": JSON.stringify({
						"avail": 1
                    }),
                    "baz": JSON.stringify({
						"avail": 0
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
        },
        verify: function(i) {
     
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

    test('Test JP data on geo', test_handle_request({
        setup: function(i) {
            i.request.country = 'JP';
            i.request
                .getData
                .onCall(0)
                .returns({
                    "foo": JSON.stringify({
						"avail": 1
                    }),
                    "bar": JSON.stringify({
						"avail": 1
                    }),
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 1
                    })
                });
        },
        verify: function(i) {
     
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('Test JP data on geo + JP below sonar threshold ', test_handle_request({
        setup: function(i) {
            i.request.country = 'JP';
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
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 1
                    })
                });
            
        },
        verify: function(i) {
     
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'origin', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.origin.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('Test JP data on geo + JP & Origin below sonar threshold ', test_handle_request({
        setup: function(i) {
            i.request.country = 'JP';
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
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
            
        },
        verify: function(i) {
     
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying setReasonCode');
        }
    }));

    test('Test CN data on geo ', test_handle_request({
        setup: function(i) {
            i.request.country = 'CN';
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
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 1
                    })
                });
            
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('Test CN data on geo no value above ', test_handle_request({
        setup: function(i) {
            i.request.country = 'CN';
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
                    "baz": JSON.stringify({
						"avail": 0
                    }),
                    "origin": JSON.stringify({
						"avail": 1
                    })
                });
            
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'origin', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.origin.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('Test CN geo + no provide above sonar ', test_handle_request({
        setup: function(i) {

            i.request.country = 'CN';
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
                    "baz": JSON.stringify({
						"avail": 0
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
            
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'origin', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.origin.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying setReasonCode');
        }
    }));

    test('Test CN geo + no provide above sonar ', test_handle_request({
        setup: function(i) {
            i.request.country = 'CN';
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
                    "baz": JSON.stringify({
						"avail": 1
                    }),
                    "origin": JSON.stringify({
						"avail": 0
                    })
                });
            
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

}());
