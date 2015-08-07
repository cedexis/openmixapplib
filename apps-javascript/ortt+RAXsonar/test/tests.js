
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

        // The TTL to be set when the application chooses a geo provider.
        default_ttl: 20,
        availability_threshold: 90,
        //Set Fusion Sonar threshold for availability for the platform to be included.
        // sonar values are between 0 - 5
        fusion_sonar_threshold: 2
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
        setup: function() {
            return;
        },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3);
            equal(i.config.requireProvider.args[2][0], 'foo');
            equal(i.config.requireProvider.args[1][0], 'bar');
            equal(i.config.requireProvider.args[0][0], 'baz');
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
                    getProbe: this.stub(),
                    getData: this.stub()
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
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 100 },
                    'bar': { avail: 85 },
                    'baz': { avail: 100 }
            });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 60 },
                    'bar': { http_rtt: 85 },
                    'baz': { http_rtt: 90 }
            });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('best_performing_provider_no_fusion', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 70 },
                    'bar': { avail: 85 },
                    'baz': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 60 },
                    'bar': { http_rtt: 85 },
                    'baz': { http_rtt: 90 }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({});
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('best_performing_provider_BRB_case', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 70 },
                    'bar': { avail: 95 },
                    'baz': { avail: 80 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 60 },
                    'bar': { http_rtt: 85 },
                    'baz': { http_rtt: 90 }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true,
                        "availability_override": true
                    })
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('all_providers_eliminated', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 80 },
                    'bar': { avail: 85 },
                    'baz': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 60 },
                    'bar': { http_rtt: 85 },
                    'baz': { http_rtt: 90 }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 1
                        },
                        "bypass_data_points": true
                    })
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('data_problem_rtt', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    'foo': { avail: 80 },
                    'bar': { avail: 85 },
                    'baz': { avail: 100 }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({});
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 1
                        },
                        "bypass_data_points": true
                    })
                });
            Math.random.returns(0.99);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('data_problem_avail', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    'foo': { http_rtt: 60 },
                    'bar': { http_rtt: 85 },
                    'baz': { http_rtt: 90 }
                });
            i.request
                .getData
                .withArgs('fusion')
                .returns({
                    "foo": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "bar": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 5
                        },
                        "bypass_data_points": true
                    }),
                    "baz": JSON.stringify({
                        "status": "HTTP server is functioning normally",
                        "state": "OK",
                        "health_score": {
                            "unit": "0-5",
                            "value": 1
                        },
                        "bypass_data_points": true
                    })
                });
            Math.random.returns(0.99);
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

}());
