
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
        availability_threshold: 80
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
            equal(i.config.requireProvider.callCount, 3, 'Verifying requireProvider call count');
            equal(i.config.requireProvider.args[2][0], 'foo', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'bar', 'Verirying provider alias');
            equal(i.config.requireProvider.args[0][0], 'baz', 'Verirying provider alias');
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

            this.stub(Math, 'random');
            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('best_performing_provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_kbps')
                .returns({
                    "foo": {
                        "http_kbps": 190
                    },
                    "bar": {
                        "http_kbps": 180
                    },
                    "baz": {
                        "http_kbps": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
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
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));
    
    test('all_providers_eliminated', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_kbps')
                .returns({
                    "foo": {
                        "http_kbps": 190
                    },
                    "bar": {
                        "http_kbps": 180
                    },
                    "baz": {
                        "http_kbps": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
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
						"avail": 0
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 1', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_kbps')
                .returns({});
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
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
						"avail": 0
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 2', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_kbps')
                .returns({
                    "foo": {
                        "http_kbps": 190
                    },
                    "bar": {
                        "http_kbps": 180
                    },
                    "baz": {
                        "http_kbps": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({});
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
						"avail": 0
                    })
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));
    
    test('data_problem - 3', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_kbps')
                .returns({
                    "foo": {
                        "http_kbps": 190
                    },
                    "bar": {
                        "http_kbps": 180
                    },
                    "baz": {
                        "http_kbps": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": {
                        "avail": 70
                    },
                    "bar": {
                        "avail": 90
                    },
                    "baz": {
                        "avail": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({});
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

}());
