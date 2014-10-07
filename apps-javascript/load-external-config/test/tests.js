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
                alias: 'cdn1',
                cname: 'www.foo.com',
                padding: 0
            },
            {
                alias: 'cdn2',
                cname: 'www.bar.com',
                padding: 0
            },
            {
                alias: 'cdn3',
                cname: 'www.baz.com',
                padding: 0
            }
        ],
        fallback: { alias: 'cdn1', cname: 'provider1.example.com' },
        availability_threshold: 90,
        min_valid_rtt_score: 5,
        default_ttl: 20,
        error_ttl: 10
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
            equal(i.config.requireProvider.args[0][0], 'cdn1', 'Verirying provider alias');
            equal(i.config.requireProvider.args[1][0], 'cdn2', 'Verirying provider alias');
            equal(i.config.requireProvider.args[2][0], 'cdn3', 'Verirying provider alias');
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

    test('all are available and cdn1 is fastest', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 203
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('all are available and cdn2 is fastest', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 202
                    },
                    "cdn2": {
                        "http_rtt": 201
                    },
                    "cdn3": {
                        "http_rtt": 202
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn2', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'wpc.50C7.cdn2.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('all are available and cdn3 is fastest', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 202
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 171
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn3', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'foo.edgesuite.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('cdn1 excluded due to availability, cdn2 next fastest despite penalty', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 79
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 203
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site2';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn2', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'wpc.50A2.cdn2.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
        }
    }));

    test('none available, choose least bad', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 79
                    },
                    "cdn2": {
                        "avail": 69
                    },
                    "cdn3": {
                        "avail": 59
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 202
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('Data problems', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 202
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A,C', 'Verifying setReasonCode');
        }
    }));

    test('Data problems 2', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({});
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 202
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('Data problems 3', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
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
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site1';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'd2ksyxg0rursd3.cdn1.net', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying setReasonCode');
        }
    }));

    test('site not listed in config, skip to fallback', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .onCall(0)
                .returns({
                    "cdn1": {
                        "avail": 100
                    },
                    "cdn2": {
                        "avail": 100
                    },
                    "cdn3": {
                        "avail": 100
                    }
                });
            i.request
                .getProbe
                .onCall(1)
                .returns({
                    "cdn1": {
                        "http_rtt": 201
                    },
                    "cdn2": {
                        "http_rtt": 202
                    },
                    "cdn3": {
                        "http_rtt": 202
                    }
                });
            i.request
                .getData
                .onCall(0)
                .returns("#customer,cdn1,cdn2,cdn3\nsite1,d2ksyxg0rursd3.cdn1.net,wpc.50C7.cdn2.net,foo.edgesuite.net\nsite2,d2ksyxg0rurg4r.cdn1.net,wpc.50A2.cdn2.net,bar.edgesuite.net");
            i.request.hostname_prefix = 'site4';
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'cdn1', 'Verifying respond provider');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
            equal(i.response.setReasonCode.args[0][0], 'A,C', 'Verifying setReasonCode');
        }
    }));

}());
