(function() {
    'use strict';

    QUnit.module('handleRequest');

    function testFun(i) {
        return function() {
            var testStuff = {
                request: new OpenmixRequest(),
                response: new OpenmixResponse()
            };
            sinon.stub(testStuff.response, 'respond');
            sinon.stub(testStuff.response, 'setReasonCode');
            sinon.stub(testStuff.response, 'setTTL');
            testStuff.request.ip_address = i.ip_address;

            testStuff.sut = new OpenmixApplication(i.appConfig || productionConfig);
            testStuff.sut.parseAddressBlocks();

            // Code under test
            testStuff.sut.handleRequest(testStuff.request, testStuff.response);

            i.verify(testStuff);
        };
    }

    QUnit.test('route on exact IP', function(assert) {
        testFun({
            ip_address: '216.240.32.100',
            verify: function(i) {
                assert.deepEqual(i.response.respond.args, [[ 'provider-d', 'd.foo.com']]);
                assert.deepEqual(i.response.setTTL.args, [[ 20 ]]);
                assert.deepEqual(i.response.setReasonCode.args, [[ 'mapped' ]]);
            }
        })();
    });

    QUnit.test('route on block', function(assert) {
        testFun({
            ip_address: '216.240.32.101',
            verify: function(i) {
                assert.deepEqual(i.response.respond.args, [[ 'provider-b', 'b.foo.com']]);
                assert.deepEqual(i.response.setTTL.args, [[ 20 ]]);
                assert.deepEqual(i.response.setReasonCode.args, [[ 'mapped' ]]);
            }
        })();
    });

    QUnit.test('route to default', function(assert) {
        testFun({
            ip_address: '1.1.1.1',
            verify: function(i) {
                assert.deepEqual(i.response.respond.args, [[ 'provider-a', 'a.foo.com']]);
                assert.deepEqual(i.response.setTTL.args, [[ 20 ]]);
                assert.deepEqual(i.response.setReasonCode.args, [[ 'default' ]]);
            }
        })();
    });
}());
