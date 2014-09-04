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
                alias: 'foo',
                cname: 'www.foo.com'
            },
            {
                alias: 'bar',
                cname: 'www.bar.com'
            }
        ],
        default_ttl: 20
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

    test('change me', test_do_init({
        setup: function(i) {
            console.log(i);
        },
        verify: function(i) {
            console.log(i);
        }
    }));

    module('handle_request');

    function test_handle_request(i) {
        return function() {
            var sut,
                request = {
                    getProbe: this.stub()
                },
                response = {
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff = {
                    request: request,
                    response: response
                };

            i.setup(test_stuff);

            sut = new OpenmixApplication(i.settings || default_settings);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('change me', test_handle_request({
        setup: function(i) {
            console.log(i);
        },
        verify: function(i) {
            console.log(i);
        }
    }));

}());
