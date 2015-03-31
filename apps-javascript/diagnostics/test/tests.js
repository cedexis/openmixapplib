(function() {
    'use strict';

    var default_settings = {
        providers: {
            'provider-a': {
                cname: 'cname1.com'
            },
            'provider-b': {
                cname: 'cname2.com'
            },
            'provider-c': {
                cname: 'cname3.com'
            }
        },
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
    
    test('default', test_do_init({
        setup: function() {
            return;
        },
        verify: function(i) {
            equal(i.config.requireProvider.callCount, 3);
            equal(i.config.requireProvider.args[2][0], 'provider-a');
            equal(i.config.requireProvider.args[1][0], 'provider-b');
            equal(i.config.requireProvider.args[0][0], 'provider-c');
        }
    }));
    
    module('handle_request');
    
    function test_handle_request(i) {
        return function() {
            var sut,
                config = {
                    requireProvider: this.stub()
                },
                request = {
                    getProbe: this.stub(),
                    getData: this.stub()
                },
                response = {
                    addCName: this.stub(),
                    respond: this.stub(),
                    setTTL: this.stub(),
                    setReasonCode: this.stub()
                },
                test_stuff;

            sut = new OpenmixApplication(i.settings || default_settings);
            sut.do_init(config);

            test_stuff = {
                request: request,
                response: response,
                sut: sut
            };

            i.setup(test_stuff);

            // Test
            sut.handle_request(request, response);

            // Assert
            i.verify(test_stuff);
        };
    }

    test('default', test_handle_request({
        setup: function(i) {
            console.log(i);
            i.request.market = 'AS';
            i.request.country = 'JP';
            i.request.asn = 1234;
            i.request
                .getProbe
                .withArgs('avail')
                .returns({
                    'provider-a': {
                        'avail': 99
                    },
                    'provider-b': {
                        'avail': 100
                    },
                    'provider-c': {
                        'avail': 100
                    }
                });
            i.request
                .getProbe
                .withArgs('http_rtt')
                .returns({
                    'provider-a': {
                        'http_rtt': 199
                    },
                    'provider-b': {
                        'http_rtt': 201
                    },
                    'provider-c': {
                        'http_rtt': 202
                    }
                });
        },
        verify: function(i) {
            console.log(i);
            equal(i.response.addCName.args[0][0], 'as-jp-1234.avail-len-3.100-100-99.rtt-len-3.202-201-199.example.com', 'Verifying CNAME');
            equal(i.response.setTTL.args[0][0], 20, 'Verifying TTL');
        }
    }));

}());
