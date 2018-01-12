(function() {
    'use strict';

	QUnit.module('do_init');

    function test_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings),
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

	QUnit.test('basic', function(assert) {
		test_init({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				}
			},
			setup: function() { return; },
			verify: function(i) {
				assert.equal(i.config.requireProvider.callCount, 2);
				assert.equal(i.config.requireProvider.args[1][0], 'foo');
				assert.equal(i.config.requireProvider.args[0][0], 'bar');
			}
		})();
	});

	QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings),
                request = {
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

	QUnit.test('foo fastest', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 201 }
				});
			},
			verify: function(i) {
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

    QUnit.test('foo fastest conditional hostname', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'foo.com',
						padding: 0
					},
					'bar': {
						cname: 'bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {
					'DE': '123',
					'UK': '456',
					'ES': '789'
				},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 201 }
				});
				i.request.country = 'UK';
				i.request.hostname_prefix = 'UK';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], '456.foo.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('foo fastest after padding', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						alias: 'foo',
						cname: 'www.foo.com',
						padding: 10
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 20
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
			},
			verify: function(i) {
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

    QUnit.test('none available', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.999999 },
					bar: { avail: 89.999999 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('geo override on market', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {
					'NA': 'bar'
				},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('geo override on country', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {
					'NA': 'bar'
				},
				country_to_provider: {
					'US': 'foo'
				},
				conditional_hostname: {},
				geo_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('country override provider not available', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				country_to_provider: {
					'US': 'foo'
				},
				market_to_provider: {},
				conditional_hostname: {},
				geo_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.99999 },
					bar: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'F,C', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('country and market override provider both not available', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				country_to_provider: {
					'US': 'foo'
				},
				market_to_provider: {
					'NA': 'bar'
				},
				conditional_hostname: {},
				geo_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.99999 },
					bar: { avail: 89.99999 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'F,G,B', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('country and market override provider both not available; blah faster than baz', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'blah': {
						cname: 'www.blah.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				country_to_provider: {
					'US': 'foo'
				},
				market_to_provider: {
					'NA': 'bar'
				},
				conditional_hostname: {},
				geo_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.99999 },
					bar: { avail: 89.99999 },
					baz: { avail: 100 },
					blah: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 },
					baz: { http_rtt: 200 },
					blah: { http_rtt: 100 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'blah', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.blah.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'F,G,A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('geo default on market', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {
					'NA': 'bar'
				},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: true,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.99999 },
					bar: { avail: 89.99999 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'I', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('geo default on country', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {
					'NA': 'bar'
				},
				country_to_provider: {
					'US': 'foo'
				},
				conditional_hostname: {},
				geo_override: false,
				geo_default: true,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 89.99999 },
					bar: { avail: 89.99999 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 200 },
					bar: { http_rtt: 200 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'H', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('boost bar with padding', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: -70
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				country_to_provider: {},
				market_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 50 },
					bar: { http_rtt: 100 },
					baz: { http_rtt: 50 },
					qux: { http_rtt: 32 }
				});
				i.request.market = 'NA';
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('avoid by geo country (request from CN)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 201 },
					qux: { http_rtt: 200 }
				});
				i.request.country = 'CN';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('test-excep_country1', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0,
						countries: [ 'CN' ]
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0,
						except_country: ['CN']
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0,
						except_country: ['CN']
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 201 },
					qux: { http_rtt: 200 }
				});
				i.request.country = 'CN';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('test-excep_country2', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0,
						countries: [ 'CN' ]
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0,
						except_country: ['CN']
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0,
						except_country: ['CN']
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 200 },
					baz: { http_rtt: 201 },
					qux: { http_rtt: 200 }
				});
				i.request.country = 'NN';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('avoid by geo country (request from US)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 200 },
					baz: { http_rtt: 201 },
					qux: { http_rtt: 100 }
				});
				i.request.country = 'US';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('avoid by geo market (request from NA)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0,
						// Considered only in the following markets
						markets: [ 'NA', 'SA' ]
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 200 },
					qux: { http_rtt: 200 }
				});
				i.request.market = 'NA';
			},
			verify: function(i) {
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

    QUnit.test('avoid by geo market (request from SA)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0,
						// Considered only in the following markets
						markets: [ 'NA', 'SA' ]
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following countries
						countries: [ 'CN' ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 200 },
					qux: { http_rtt: 200 }
				});
				i.request.market = 'SA';
			},
			verify: function(i) {
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

    QUnit.test('avoid by geo market (request from AS)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0,
						// Considered only in the following markets
						markets: [ 'NA', 'SA' ]
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 200 },
					qux: { http_rtt: 200 }
				});
				i.request.market = 'AS';
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('asn_override 1', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				asn_to_provider: {
					123: 'baz',
					124: 'bar'
				},
				conditional_hostname: {},
				geo_override: false,
				asn_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 200 },
					qux: { http_rtt: 200 }
				});
				i.request.asn = 123;
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'J', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('asn_override_not_available', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				asn_to_provider: {
					123: 'baz',
					124: 'bar'
				},
				conditional_hostname: {},
				geo_override: false,
				asn_override: true,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 80 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 200 },
					qux: { http_rtt: 201 }
				});
				i.request.asn = 124;
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'K,A', 'Verifying reason code');
			}
		})();
	});

    QUnit.test('avoid by geo asn (request from 123)', function(assert) {
		test_handle_request({
			settings: {
				providers: {
					'foo': {
						cname: 'www.foo.com',
						padding: 0
					},
					'bar': {
						cname: 'www.bar.com',
						padding: 0
					},
					'baz': {
						cname: 'www.baz.com',
						padding: 0
					},
					'qux': {
						cname: 'www.qux.com',
						padding: 0,
						// Considered only in the following asns
						asns: [ 123 ]
					}
				},
				availability_threshold: 90,
				market_to_provider: {},
				country_to_provider: {},
				conditional_hostname: {},
				geo_override: false,
				geo_default: false,
				default_provider: 'foo',
				default_ttl: 20,
				error_ttl: 10
			},
			setup: function(i) {
				i.request.getProbe.onCall(0).returns({
					foo: { avail: 100 },
					bar: { avail: 100 },
					baz: { avail: 100 },
					qux: { avail: 100 }
				});
				i.request.getProbe.onCall(1).returns({
					foo: { http_rtt: 201 },
					bar: { http_rtt: 201 },
					baz: { http_rtt: 201 },
					qux: { http_rtt: 200 }
				});
				i.request.asn = 123;
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'qux', 'Verifying selected alias');
				assert.equal(i.response.respond.args[0][1], 'www.qux.com', 'Verifying CNAME');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying reason code');
			}
		})();
	});

}());
