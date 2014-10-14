
(function() {
    'use strict';

    module('do_init');

    function test_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings),
                config = {
                    requireProvider: function() { return; }
                },
                test_stuff;

            test_stuff = {
                requireProvider: this.stub(config, 'requireProvider')
            };

            i.setup(test_stuff);

            // Test
            sut.do_init(config);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('basic', test_init({
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
            }
        },
        setup: function() {
            return;
        },
        verify: function(i) {
            console.log(i);
            equal(i.requireProvider.callCount, 3);
            equal(i.requireProvider.args[2][0], 'foo');
            equal(i.requireProvider.args[1][0], 'bar');
            equal(i.requireProvider.args[0][0], 'baz');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings),
                request,
                response,
                test_stuff;

            request = {
                getProbe: function() { return; }
            };
            response = {
                respond: function() { return; },
                setTTL: function() { return; },
                setReasonCode: function() { return; }
            };

            test_stuff = {
                request: request,
                getProbe: this.stub(request, 'getProbe'),
                respond: this.stub(response, 'respond'),
                setTTL: this.stub(response, 'setTTL'),
                setReasonCode: this.stub(response, 'setReasonCode')
            };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('geo country overrides', test_handle_request({
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
            availability_threshold: 90,
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'EG';
        },
        verify: function(i) {
            console.log(i);
            equal(i.respond.callCount, 1, 'Verifying respond call count');
            equal(i.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('geo markets', test_handle_request({
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
            availability_threshold: 90,
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'US';
            i.request.market = 'EG';
        },
        verify: function(i) {
            console.log(i);
            equal(i.respond.callCount, 1, 'Verifying respond call count');
            equal(i.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.setReasonCode.args[0][0], 'A', 'Verifying reason code');
        }
    }));

    test('unexpected market', test_handle_request({
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
            availability_threshold: 90,
            country_to_provider: { 'UK': 'bar' },
            market_to_provider: { 'EG': 'foo' },
            default_provider: 'baz',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'US';
            i.request.market = 'FR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.respond.callCount, 1, 'Verifying respond call count');
            equal(i.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.respond.args[0][0], 'baz', 'Verifying selected alias');
            equal(i.respond.args[0][1], 'www.baz.com', 'Verifying CNAME');
            equal(i.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

}());
