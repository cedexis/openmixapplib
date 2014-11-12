
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
        default_ttl: 90,
        min_valid_rtt_score: 5,
        need_sonar_data: true,
        sonar_threshold: 0.95
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

    test('one_acceptable_provider', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "0.80000",
                    "bar": "1.00000",
                    "baz": "0.80000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('sonar_data_not_robust', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "bar": "0.80000",
                    "baz": "1.00000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
        }
    }));

    test('sonar_data_not_robust_random', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "bar": "1.00000",
                    "baz": "1.00000"
                });
            Math.random.returns(0.9);
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
        }
    }));

    test('no_available_providers', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "0.80000",
                    "bar": "0.80000",
                    "baz": "0.80000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'CD', 'Verifying reason code');
        }
    }));

    test('best_provider_selected', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "1.00000",
                    "bar": "1.00000",
                    "baz": "0.80000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('radar_rtt_not_robust_no_sonar', test_handle_request({
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
            default_ttl: 90,
            min_valid_rtt_score: 5,
            use_sonar_data: false,
            sonar_threshold: 0.95
        },
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 1
                    },
                    "bar": {
                        "http_rtt": 180
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "0.80000",
                    "bar": "1.00000",
                    "baz": "0.80000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'F', 'Verifying reason code');
        }
    }));

    test('no_available_providers_no_sonar', test_handle_request({
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
            default_ttl: 90,
            min_valid_rtt_score: 5,
            use_sonar_data: false,
            sonar_threshold: 0.95
        },
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({});
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "0.80000",
                    "bar": "0.80000",
                    "baz": "0.80000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'CD', 'Verifying reason code');
        }
    }));

    test('best_provider_selected_no_sonar', test_handle_request({
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
            default_ttl: 90,
            min_valid_rtt_score: 5,
            use_sonar_data: false,
            sonar_threshold: 0.95
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
                        "http_rtt": 180
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "1.00000",
                    "bar": "1.00000"
                });
        },
        verify: function(i) {
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 90, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

}());
