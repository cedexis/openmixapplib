(function() {
    'use strict';

    QUnit.module('doInit');

    function testFun(i) {
        return function() {
            var testStuff = {
                config: new ApplicationConfig()
            };
            sinon.stub(testStuff.config, 'requireProvider');

            testStuff.sut = new OpenmixApplication(i.appConfig || productionConfig);

            // Code under test
            testStuff.sut.doInit(testStuff.config);

            i.verify(testStuff);
        };
    }

    QUnit.test('foo', function(assert) {
        testFun({
            verify: function(i) {
                var expectedArgs = [
                    [ 'provider-a' ],
                    [ 'provider-b' ],
                    [ 'provider-c' ],
                    [ 'provider-d' ]
                ];
                assert.deepEqual(i.config.requireProvider.args, expectedArgs);
                var temp = i.sut.addressBlocks[0];
                assert.equal(temp[2].first, '216.240.32.100');
                assert.equal(temp[2].last, '216.240.32.100');
                temp = i.sut.addressBlocks[1];
                assert.equal(temp[2].first, '216.240.32.1');
                assert.equal(temp[2].last, '216.240.32.254');
            }
        })();
    });
}());
