module('handleRequest');

var defaultAppConfig = {
    providers: {
        'primary': {
            cname: 'foo.primary.com'
        },
        'alternate_a': {
            cname: 'foo.alternate-a.com'
        },
        'alternate_b': {
            cname: 'foo.alternate-b.com'
        }
    },
    fusionFeedProvider: 'fusion_feed',
    defaultProvider: 'primary',
    defaultTTL: 60, // the TTL when one of the alternate providers is selected
    minTTL: 20, // the (theoretical) TTL when like POP sample rate is 0%
    maxTTL: 600, // the TTL when likely POP sample rate is 100%
    availabilityThreshold: 90,
    marketWeights: {
        'AS': {
            'alternate_a': 90,
            'alternate_b': 10
        },
        'NA': {
            'alternate_a': 25,
            'alternate_b': 75
        }
    },
    defaultMarketWeights: {
        'alternate_a': 50,
        'alternate_b': 50
    }
};

function test_handleRequest(i) {
    return function() {
        var sut = new OpenmixApplication(i.config || defaultAppConfig);
        var request = new OpenmixRequest(i);
        var response = new OpenmixResponse(i);
        var testStuff = {
            instance: sut,
            request: request,
            response: response
        };

        request.getProbe.withArgs('avail').returns(i.avail || {
            'primary': { 'avail': 100 },
            'alternate_a': { 'avail': 100 },
            'alternate_b': { 'avail': 100 }
        });

        this.stub(sut, 'parseFusionData');
        this.stub(Math, 'random');
        this.clock.now = i.timestamp || 1428851420000;
        this.stub(response, 'respond');
        this.stub(response, 'setTTL');
        this.stub(response, 'setReasonCode');

        i.setup(testStuff);

        // Code under test
        sut.handleRequest(request, response);

        i.verify(testStuff);
    }
}

test('default', test_handleRequest({
    timestamp: 1428831120000,
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T08': {
                        'LHR': 70,
                        'AMS': 70,
                        'DFW': 70,
                        'SJC': 70
                    },
                    '2015-04-12T07': {
                        'LHR': 60,
                        'AMS': 60,
                        'DFW': 60,
                        'SJC': 60
                    },
                    '2015-04-12T09': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.499999999999);
    },
    verify: function(i) {
        equal(i.response.respond.args[0][0], 'primary');
        equal(i.response.respond.args[0][1], 'foo.primary.com');
        ok(i.response.setTTL.called);
        equal(i.response.setReasonCode.args[0][0], 'default');
    }
}));

test('100% capacity TTL', test_handleRequest({
    timestamp: 1428831120000,
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T09': {
                        'LHR': 100,
                        'AMS': 100,
                        'DFW': 100,
                        'SJC': 100
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.499999999999);
    },
    verify: function(i) {
        equal(i.response.setTTL.args[0][0], 600);
    }
}));

test('1% capacity TTL', test_handleRequest({
    timestamp: 1428831120000,
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T09': {
                        'LHR': 100,
                        'AMS': 100,
                        'DFW': 1,
                        'SJC': 100
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.009999999999);
    },
    verify: function(i) {
        equal(i.response.setTTL.args[0][0], 26);
    }
}));

test('10% capacity TTL', test_handleRequest({
    timestamp: 1428831120000,
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T09': {
                        'LHR': 100,
                        'AMS': 100,
                        'DFW': 10,
                        'SJC': 100
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.09999999999);
    },
    verify: function(i) {
        equal(i.response.setTTL.args[0][0], 78);
    }
}));

test('primary not available', test_handleRequest({
    avail: {
        'primary': { 'avail': 89 },
        'alternate_a': { 'avail': 100 },
        'alternate_b': { 'avail': 100 }
    },
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T08': {
                        'LHR': 20,
                        'AMS': 20,
                        'DFW': 20,
                        'SJC': 20
                    },
                    '2015-04-12T07': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    },
                    '2015-04-12T09': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.1999999999);
    },
    verify: function(i) {
        equal(i.response.respond.args[0][0], 'alternate_a');
        equal(i.response.respond.args[0][1], 'foo.alternate-a.com');
        ok(i.response.setTTL.called);
        equal(i.response.setReasonCode.args[0][0], 'default unavailable;using market-weighted alternates');
    }
}));

test('none available', test_handleRequest({
    avail: {
        'primary': { 'avail': 89 },
        'alternate_a': { 'avail': 89 },
        'alternate_b': { 'avail': 89 }
    },
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T08': {
                        'LHR': 20,
                        'AMS': 20,
                        'DFW': 20,
                        'SJC': 20
                    },
                    '2015-04-12T07': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    },
                    '2015-04-12T09': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                },
                'countries': {
                    'US': 'DFW'
                }
            }
        });
        Math.random.returns(0.1999999999);
    },
    verify: function(i) {
        equal(i.response.respond.args[0][0], 'primary');
        equal(i.response.respond.args[0][1], 'foo.primary.com');
        equal(i.response.setReasonCode.args[0][0], 'default unavailable;using market-weighted alternates;alternate_a unavailable;alternate_b unavailable');
        ok(i.response.setTTL.called);
    }
}));

test('missing current period; use default', test_handleRequest({
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T07': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    },
                    '2015-04-12T09': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                },
                'countries': {
                    'US': 'DFW'
                },
                'default': {
                    'LHR': 90,
                    'AMS': 90,
                    'DFW': 90,
                    'SJC': 90
                }
            }
        });
        Math.random.returns(0.8999999999);
    },
    verify: function(i) {
        equal(Math.random.callCount, 1, 'Math.random call count');
        equal(i.response.respond.args[0][0], 'primary');
        equal(i.response.respond.args[0][1], 'foo.primary.com');
        ok(i.response.setTTL.called);
        equal(i.response.setReasonCode.args[0][0], 'default sample rates;default');
    }
}));

test('missing current period; use default; over capacity; default market weights', test_handleRequest({
    market: 'BLAH',
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T07': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    },
                    '2015-04-12T09': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                },
                'countries': {
                    'US': 'DFW'
                },
                'default': {
                    'LHR': 90,
                    'AMS': 90,
                    'DFW': 90,
                    'SJC': 90
                }
            }
        });
        Math.random.onCall(0).returns(0.90);
        Math.random.onCall(1).returns(0.9999999999);
    },
    verify: function(i) {
        equal(Math.random.callCount, 2, 'Math.random call count');
        equal(i.response.respond.args[0][0], 'alternate_b');
        equal(i.response.respond.args[0][1], 'foo.alternate-b.com');
        ok(i.response.setTTL.called);
        equal(i.response.setReasonCode.args[0][0], 'default sample rates;default provider not sampled;using market-weighted alternates');
    }
}));

test('unknown country', test_handleRequest({
    country: 'BLAH',
    setup: function(i) {
        i.instance.parseFusionData.returns({
            'fusion_feed': {
                'periods': {
                    '2015-04-12T08': {
                        'LHR': 50,
                        'AMS': 50,
                        'DFW': 50,
                        'SJC': 50
                    }
                }
            }
        });
        Math.random.onCall(0).returns(0.249999);
    },
    verify: function(i) {
        equal(i.response.respond.args[0][0], 'alternate_a');
        equal(i.response.respond.args[0][1], 'foo.alternate-a.com');
        ok(i.response.setTTL.called);
        equal(i.response.setReasonCode.args[0][0], 'unknown country (BLAH);using market-weighted alternates');
    }
}));

function test_parseFusionData(i) {
    return function() {
        var sut = new OpenmixApplication(i.config || appConfig);
        var testStuff = { instance: sut };

        i.setup(testStuff);

        // Code under test
        var result = sut.parseFusionData(i.data);

        deepEqual(result, i.result, 'Veryify result');
    };
}

test('find Fusion data in cache', test_parseFusionData({
    setup: function(i) {
        var temp, tempAsString;
        this.data = {};

        temp = { 'abc': 123 };
        tempAsString = JSON.stringify(temp);
        this.data['foo'] = tempAsString;
        i.instance.__fusionDataCache['foo'] = {
            value: tempAsString,
            json: { find_me_instead: true }
        };

        temp = { 'def': 345 };
        tempAsString = JSON.stringify(temp);
        this.data['bar'] = tempAsString;
        i.instance.__fusionDataCache['bar'] = {
            value: tempAsString,
            json: temp
        };
    },
    result: {
        foo: { find_me_instead: true },
        bar: { def: 345 }
    }
}));

function OpenmixRequest(i) {
    this.country = i.country || 'US';
    this.market = i.market || 'NA';
}

OpenmixRequest.prototype.getData = sinon.stub();
OpenmixRequest.prototype.getProbe = sinon.stub();

function OpenmixResponse() {}

OpenmixResponse.prototype.respond = function(provider, hostOrIP) {};
OpenmixResponse.prototype.setTTL = function(value) {};
OpenmixResponse.prototype.setReasonCode = function(reason) {};
