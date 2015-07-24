(function() {
    'use strict';

    module('handleRequest');

    function testFun(i) {
        return function() {
            var testStuff = {
                request: new OpenmixRequest(),
                response: new OpenmixResponse()
            };
            this.stub(testStuff.response, 'respond');
            this.stub(testStuff.response, 'setReasonCode');
            this.stub(testStuff.response, 'setTTL');
            testStuff.request.ip_address = i.ip_address;

            testStuff.sut = new OpenmixApplication(i.appConfig || productionConfig);
            testStuff.sut.parseAddressBlocks();

            // Code under test
            testStuff.sut.handleRequest(testStuff.request, testStuff.response);

            i.verify(testStuff);
        };
    }

    test('route on exact IP', testFun({
        ip_address: '216.240.32.100',
        verify: function(i) {
            deepEqual(i.response.respond.args, [[ 'provider-d', 'd.foo.com']]);
            deepEqual(i.response.setTTL.args, [[ 20 ]]);
            deepEqual(i.response.setReasonCode.args, [[ 'mapped' ]]);
        }
    }));

    test('route on block', testFun({
        ip_address: '216.240.32.101',
        verify: function(i) {
            deepEqual(i.response.respond.args, [[ 'provider-b', 'b.foo.com']]);
            deepEqual(i.response.setTTL.args, [[ 20 ]]);
            deepEqual(i.response.setReasonCode.args, [[ 'mapped' ]]);
        }
    }));

    test('route to default', testFun({
        ip_address: '1.1.1.1',
        verify: function(i) {
            deepEqual(i.response.respond.args, [[ 'provider-a', 'a.foo.com']]);
            deepEqual(i.response.setTTL.args, [[ 20 ]]);
            deepEqual(i.response.setReasonCode.args, [[ 'default' ]]);
        }
    }));
}());
