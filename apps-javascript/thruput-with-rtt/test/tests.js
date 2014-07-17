/*global
    module,
    test,
    deepEqual,
    OpenmixApplication,
    init,
    onRequest,
*/

var handler;

(function() {
    'use strict';

    module('init');

    function test_init(i) {
        return function() {

            var config = {
                    requireProvider: function() { return; }
                },
                test_stuff,
                stub_requireProvider;

            handler = new OpenmixApplication();
            handler.providers = i.providers || {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.example.com'
                }
            };

            stub_requireProvider = this.stub(config, 'requireProvider');

            test_stuff = {
                requireProvider: stub_requireProvider
            };

            i.setup(test_stuff);

            // Test
            init(config);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('calls requiresProvider', test_init({
        setup: function() { return; },
        verify: function(i) {
            deepEqual(
                i.requireProvider.args,
                [
                    [ 'a' ],
                    [ 'b' ],
                    [ 'c' ]
                ]
            );
        }
    }));

    module('onRequest');

    function test_onRequest(i) {
        return function() {
            var request,
                response,
                test_stuff,
                stub_getProbe,
                stub_respond,
                stub_setTTL,
                stub_setReasonCode,
                stub_get_random;

            request = {
                getProbe: function() { return; }
            };
            response = {
                respond: function() { return; },
                setTTL: function() { return; },
                setReasonCode: function() { return; }
            };

            handler = new OpenmixApplication();
            handler.providers = i.providers || {
                'a': {
                    cname: 'a.com'
                },
                'b': {
                    cname: 'b.com'
                },
                'c': {
                    cname: 'c.com'
                }
            };

            handler.avail_threshold = i.avail_threshold || 90;
            handler.tie_threshold = i.tie_threshold || 0.95;
            handler.ttl = i.ttl || 20;

            stub_getProbe = this.stub(request, 'getProbe');
            stub_respond = this.stub(response, 'respond');
            stub_setTTL = this.stub(response, 'setTTL');
            stub_setReasonCode = this.stub(response, 'setReasonCode');
            stub_get_random = this.stub(handler, 'get_random');

            test_stuff = {
                getProbe: stub_getProbe,
                respond: stub_respond,
                setTTL: stub_setTTL,
                setReasonCode: stub_setReasonCode,
                get_random: stub_get_random
            };

            i.setup(test_stuff);

            // Test
            onRequest(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('b fastest but unavailable; c missing KBPS data', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 89.99999,
                    'c': 90
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': 5000,
                    'b': 6000
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': 200,
                    'b': 200,
                    'c': 200
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'A' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('b fastest but unavailable; no tie', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 89.99999,
                    'c': 90
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': 5000,
                    'b': 6000,
                    'c': 7000
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': 200,
                    'b': 200,
                    'c': 200
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'A' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('tie; b has fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 90,
                    'c': 90
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': 5000,
                    'b': 5000,
                    'c': 5000
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': 200,
                    'b': 199,
                    'c': 200
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'B' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('c unavailable; no KBPS data; b fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 90,
                    'c': 8.99999
                });
                i.getProbe.withArgs('http_kbps').returns({});
                i.getProbe.withArgs('http_rtt').returns({
                    'a': 150,
                    'b': 149,
                    'c': 100
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'B' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('only one provider available', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 89.99998,
                    'c': 89.99999
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'D' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all unavailable', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 89.99997,
                    'b': 89.99998,
                    'c': 89.99999
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'D' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all available; no KBPS or RTT data', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': 90,
                    'b': 90,
                    'c': 90
                });
                i.getProbe.withArgs('http_kbps').returns({});
                i.getProbe.withArgs('http_rtt').returns({});
                i.get_random.returns(0.6789);
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'C' ] ], 'Verifying setReasonCode');
            }
        }
    ));

}());
