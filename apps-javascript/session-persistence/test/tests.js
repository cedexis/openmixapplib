
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
        default_ttl: 20,
        sonar_threshold: 0.95,
        availability_threshold: 85,
        rtt_variance:0.15,
        identifier: 0,
        replicas: 1
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

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('test 1', test_handle_request({
        setup: function(i) {
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    "foo": {
                        "http_rtt": 190
                    },
                    "bar": {
                        "http_rtt": 190
                    },
                    "baz": {
                        "http_rtt": 100
                    }
                });
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    "foo": { "avail": 100 },
                    "bar": { "avail": 100 },
                    "baz": { "avail": 100 }
                });
            i.request
                .getData
                .withArgs('sonar')
                .returns({
                    "foo": "1.00000",
                    "bar": "1.00000",
                    "baz": "1.00000"
                });
        },
        verify: function(i) {
            equal(i.request.getData.callCount, 1, 'Verifying getData call count');
            equal(i.response.respond.callCount, 1, 'Verifying respond call count');
            equal(i.response.setTTL.callCount, 1, 'Verifying setTTL call count');
            equal(i.response.setReasonCode.callCount, 1, 'Verifying setReasonCode call count');
            equal(i.response.setReasonCode.args[0][0], 'E', 'Verifying setReasonCode');
        }
    }));

}());
