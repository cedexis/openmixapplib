(function() {
    'use strict';

    module('init');

    function test_init(i) {
        return function() {

            var sut,
                config = {
                    requireProvider: function() { return; }
                },
                test_stuff,
                stub_requireProvider;

            sut = new OpenmixApplication({
                providers: {
                    'a': {
                        cname: 'a.com'
                    },
                    'b': {
                        cname: 'b.com'
                    },
                    'c': {
                        cname: 'c.example.com'
                    }
                },
                availability_threshold: 90,
                throughput_tie_threshold: 0.95,
                default_ttl: 20,
                error_ttl: 20,
                min_valid_rtt_score: 5,
            });

            stub_requireProvider = this.stub(config, 'requireProvider');

            test_stuff = {
                requireProvider: stub_requireProvider
            };

            i.setup(test_stuff);

            // Test
            sut.do_init(config);

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
                    [ 'c' ],
                    [ 'b' ],
                    [ 'a' ]
                ]
            );
        }
    }));

    module('onRequest');

    function test_onRequest(i) {
        return function() {
            var sut,
                config,
                request,
                response,
                test_stuff,
                stub_getProbe,
                stub_respond,
                stub_setTTL,
                stub_setReasonCode,
                stub_get_random;

            config = {
                requireProvider: function() { return; }
            };
            request = {
                getProbe: function() { return; }
            };
            response = {
                respond: function() { return; },
                setTTL: function() { return; },
                setReasonCode: function() { return; }
            };

            sut = new OpenmixApplication({
                providers: {
                    'a': {
                        cname: 'a.com'
                    },
                    'b': {
                        cname: 'b.com'
                    },
                    'c': {
                        cname: 'c.com'
                    }
                },
                availability_threshold: 90,
                throughput_tie_threshold: 0.95,
                default_ttl: 20,
                error_ttl: 20,
                min_valid_rtt_score: 5,
            });
            sut.do_init(config);

            stub_getProbe = this.stub(request, 'getProbe');
            stub_respond = this.stub(response, 'respond');
            stub_setTTL = this.stub(response, 'setTTL');
            stub_setReasonCode = this.stub(response, 'setReasonCode');
            stub_get_random = this.stub(Math, 'random');

            test_stuff = {
                getProbe: stub_getProbe,
                respond: stub_respond,
                setTTL: stub_setTTL,
                setReasonCode: stub_setReasonCode,
                get_random: stub_get_random
            };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('b fastest but unavailable; c missing KBPS data', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99999 },
                    'c': { avail: 90 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 6000 }
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 200 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'A2' ] ], 'Verifying setReasonCode');
                equal(i.get_random.callCount, 0);
            }
        }
    ));

    test('b fastest but unavailable; no tie', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99999 },
                    'c': { avail: 90 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 6000 },
                    'c': { http_kbps: 7000 }
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 200 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'A1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('tie; b has fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 90 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': { http_kbps: 5000 },
                    'b': { http_kbps: 5000 },
                    'c': { http_kbps: 5000 }
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 200 },
                    'b': { http_rtt: 199 },
                    'c': { http_rtt: 200 }
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'B1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('c unavailable; no KBPS data; b fastest RTT', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 89.99999 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': { http_rtt: 150 },
                    'b': { http_rtt: 149 },
                    'c': { http_rtt: 100 }
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'b', 'b.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'B2' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('only one provider available', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 89.99998 },
                    'c': { avail: 89.99999 }
                });
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'a', 'a.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'D1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all unavailable', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 89.99997 },
                    'b': { avail: 89.99998 },
                    'c': { avail: 89.99999 }
                });
                i.get_random.returns(0.99);
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'D1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('all available; no KBPS or RTT data', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 90 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.get_random.returns(0.6789);
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'C1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('no data', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': {}
                });
                i.get_random.returns(0.6789);
            },
            verify: function(i) {
                deepEqual(i.respond.args, [ [ 'c', 'c.com' ] ], 'Verifying respond');
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'D2' ] ], 'Verifying setReasonCode');
            }
        }
    ));

    test('no KBPS data for available providers', test_onRequest(
        {
            setup: function(i) {
                i.getProbe.withArgs('avail').returns({
                    'a': { avail: 90 },
                    'b': { avail: 90 },
                    'c': { avail: 89.99999 }
                });
                i.getProbe.withArgs('http_kbps').returns({
                    'a': {},
                    'b': {},
                    'c': { http_kbps: 4000 }
                });
                i.getProbe.withArgs('http_rtt').returns({
                    'a': {},
                    'b': {},
                    'c': { http_rtt: 200 }
                });
                i.get_random.returns(0.0101);
            },
            verify: function(i) {
                deepEqual(
                    i.respond.args,
                    [
                        [
                            'a',
                            'a.com'
                        ]
                    ],
                    'Verifying respond'
                );
                deepEqual(i.setTTL.args, [ [ 20 ] ], 'Verifying setTTL');
                deepEqual(i.setReasonCode.args, [ [ 'C1' ] ], 'Verifying setReasonCode');
            }
        }
    ));

}());
