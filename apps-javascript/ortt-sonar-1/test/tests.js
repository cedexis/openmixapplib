
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
        availability_threshold: 90
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: sinon.stub()
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

    QUnit.test('default', function(assert) {
        test_do_init({
            setup: function() {
                return;
            },
            verify: function(i) {
                assert.equal(i.config.requireProvider.callCount, 3);
                assert.equal(i.config.requireProvider.args[2][0], 'foo');
                assert.equal(i.config.requireProvider.args[1][0], 'bar');
                assert.equal(i.config.requireProvider.args[0][0], 'baz');
            }
        })();
    });

    QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: sinon.stub()
                },
                request = {
                    getProbe: sinon.stub(),
                    getData: sinon.stub()
                },
                response = {
                    respond: sinon.stub(),
                    setTTL: sinon.stub(),
                    setReasonCode: sinon.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);
            sut.do_init(config);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
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

    QUnit.test('best_performing_provider', function(assert) {
        test_handle_request({
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
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('best_performing_provider_no_fusion', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({});
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('all_providers_eliminated', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
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
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('data_problem_rtt', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
                Math.random.returns(0.99);
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

    QUnit.test('data_problem_avail', function(assert) {
        test_handle_request({
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
                    .withArgs('sonar')
                    .returns({
                        "foo": JSON.stringify({
                            "avail": 1
                        }),
                        "bar": JSON.stringify({
                            "avail": 1
                        }),
                        "baz": JSON.stringify({
                            "avail": 0
                        })
                    });
                Math.random.returns(0.99);
            },
            verify: function(i) {
                console.log(i);
                assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
                assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
                assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

                assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
                assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
                assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
                assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
            }
        })();
    });

}());
