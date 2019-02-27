
(function() {
    'use strict';

    var default_settings = {
        // The TTL to be set when the application chooses a geo provider.
        default_ttl: 20
    };

    QUnit.module('do_init');

    function test_do_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings || default_settings),
                config = {
                    requireProvider: sinon.stub(),
					getProviders: sinon.stub()
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
			setup: function(i) {
				i.config
					.getProviders
					.returns({
						"foo": {
							"response": "www.foo.com"
						},
						"bar": {
							"response": "www.bar.com"
						},
						"baz": {
							"response": "www.baz.com"
						}
					});
			},
			verify: function(i) {
				assert.equal(i.config.getProviders.callCount, 1);
			}
		})();
	});

	QUnit.module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings || default_settings),
				config = {
					getProviders: sinon.stub()
				},
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
					config: config,
                    request: request,
                    response: response
                };

            var random = sinon.stub(Math, 'random');

            i.setup(test_stuff);

			sut.do_init(config);
            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
			random.restore();
        };
    }

	QUnit.test('random_selection_1', function(assert) {
		test_handle_request({
			setup: function(i) {
				i.config
					.getProviders
					.returns({
						"foo": {
							"response": "www.foo.com"
						},
						"bar": {
							"response": "www.bar.com"
						},
						"baz": {
							"response": "www.baz.com"
						}
					});
				Math.random.returns(0);
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'foo', 'Verifying respond provider');
				assert.equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying respond CNAME');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
			}
		})();
	});

	QUnit.test('random_selection_2', function(assert) {
		test_handle_request({
			setup: function(i) {
				i.config
					.getProviders
					.returns({
						"foo": {
							"response": "www.foo.com"
						},
						"bar": {
							"response": "www.bar.com"
						},
						"baz": {
							"response": "www.baz.com"
						}
					});
				Math.random.returns(0.9);
			},
			verify: function(i) {
				assert.equal(i.response.respond.callCount, 1, 'Verifying respond call count');
				assert.equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
				assert.equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

				assert.equal(i.response.respond.args[0][0], 'baz', 'Verifying respond provider');
				assert.equal(i.response.respond.args[0][1], 'www.baz.com', 'Verifying respond CNAME');
				assert.equal(i.response.setReasonCode.args[0][0], 'A', 'Verifying setReasonCode');
				assert.equal(i.response.setTTL.args[0][0], 20, 'Verifying setTTL');
			}
		})();
	});

}());
