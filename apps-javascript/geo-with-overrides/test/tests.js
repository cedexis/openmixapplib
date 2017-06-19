
(function() {
    'use strict';

    module('do_init');

    function test_init(i) {
        return function() {

            var sut = new OpenmixApplication(i.settings),
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
            equal(i.config.requireProvider.callCount, 3);
            equal(i.config.requireProvider.args[2][0], 'foo');
            equal(i.config.requireProvider.args[1][0], 'bar');
            equal(i.config.requireProvider.args[0][0], 'baz');
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut = new OpenmixApplication(i.settings),
                request = {
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
                    response:response
                };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('geo_override_on_market', test_handle_request({
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
            geo_order: ['asn', 'state', 'country', 'market'],
            availability_threshold: 90,
            geo_override: {
                'market': { 'EG': 'foo' },
                'country': { 'UK': 'bar' },
                'state': {},
                'asn': {}
            },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UX';
            i.request.market = 'EG';
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

    test('geo_override_on_country', test_handle_request({
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
            geo_order: ['asn', 'state', 'country', 'market'],
            availability_threshold: 90,
            geo_override: {
                'market': { 'EG': 'foo' },
                'country': { 'UK': 'bar' },
                'state': {},
                'asn': {}
            },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'UK';
            i.request.market = 'XX';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'B', 'Verifying reason code');
        }
    }));

    test('geo_override_on_state', test_handle_request({
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
            geo_order: ['asn', 'state', 'country', 'market'],
            availability_threshold: 90,
            geo_override: {
                'market': { 'EG': 'foo' },
                'country': { 'UK': 'bar' },
                'state': { 'US-S-AR': 'bar' },
                'asn': {}
            },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'XX';
            i.request.market = 'XX';
            i.request.state = 'US-S-AR';
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'bar', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.bar.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'C', 'Verifying reason code');
        }
    }));

    test('geo_override_on_asn', test_handle_request({
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
            geo_order: ['asn', 'state', 'country', 'market'],
            availability_threshold: 90,
            geo_override: {
                'market': { 'EG': 'foo' },
                'country': { 'UK': 'bar' },
                'state': { 'US-S-AR': 'bar' },
                'asn': { '1234': 'foo' }
            },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'XX';
            i.request.market = 'XX';
            i.request.state = 'US-S-XX';
            i.request.asn = 1234;
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'D', 'Verifying reason code');
        }
    }));

    test('default_provider', test_handle_request({
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
            geo_order: ['asn', 'state', 'country', 'market'],
            availability_threshold: 90,
            geo_override: {
                'market': { 'EG': 'foo' },
                'country': { 'UK': 'bar' },
                'state': { 'US-S-AR': 'bar' },
                'asn': { '1234': 'foo' }
            },
            default_provider: 'foo',
            default_ttl: 20,
            error_ttl: 10
        },
        setup: function(i) {
            console.log(i);
            i.request.country = 'XX';
            i.request.market = 'XX';
            i.request.state = 'US-S-XX';
            i.request.asn = 1235;
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');

            equal(i.response.respond.args[0][0], 'foo', 'Verifying selected alias');
            equal(i.response.respond.args[0][1], 'www.foo.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 10, 'Verifying TTL');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying reason code');
        }
    }));

}());
