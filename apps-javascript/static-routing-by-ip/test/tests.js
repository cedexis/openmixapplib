
(function() {
    'use strict';

    var default_settings = {
        providers: {
            'provider-a': {
                'cname': 'a.foo.com'
            },
            'provider-b': {
                'cname': 'b.foo.com'
            },
            'provider-c': {
                'cname': 'c.foo.com'
            },
            'provider-d': {
                'cname': 'd.foo.com'
            }
        },
        // Each address block listed here will be used to route requests to a
        // specific provider.  Addresses not falling into any of these blocks will
        // be routed to the default provider.
        // These are evaluated from top to bottom, so more specific blocks should
        // come before larger or overlapping blocks.
        addressBlocks: [
            [ '216.240.32.100/32', 'provider-d' ],
            [ '216.240.32.0/24', 'provider-b' ],
            [ '216.240.33.0/25', 'provider-a' ],
            [ '216.240.33.128/25', 'provider-c' ]
        ],
        defaultProvider: 'provider-a',
        responseTTL: 20
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
                var expectedArgs = [
                    [ 'provider-a' ],
                    [ 'provider-b' ],
                    [ 'provider-c' ],
                    [ 'provider-d' ]
                ];
                assert.deepEqual(i.config.requireProvider.args, expectedArgs);
                assert.equal(i.config.requireProvider.callCount, 4);
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

    QUnit.test('test 1 ip_override_sonar_avail', function(assert) {
        test_handle_request({
            setup: function(i) {
                i.request.ip_address = '216.240.32.100';
            },
            verify: function(i) {
                assert.deepEqual(i.response.respond.args, [[ 'provider-d', 'd.foo.com']]);
                assert.deepEqual(i.response.setTTL.args, [[ 20 ]]);
                assert.deepEqual(i.response.setReasonCode.args, [[ 'mapped' ]]);
            }
        })();
    });

}());
