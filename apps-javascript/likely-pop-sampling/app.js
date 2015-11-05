'use strict';

var appConfig = {
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

var handler = new OpenmixApplication(appConfig);

/**
 * @constructor
 * @param {!Object} settings
 */
function OpenmixApplication(settings) {
    this.__settings = settings;

    /**
     * @type {!Object.<string, Object>}
     */
    this.__fusionDataCache = {};
}

/**
 * @param {!OpenmixConfig} config
 */
OpenmixApplication.prototype.handleInit = function(config) {
    var keys = Object.keys(this.__settings.providers);
    for (var i = 0; i < keys.length; i++) {
        config.requireProvider(keys[i]);
    }
    config.requireProvider(this.__settings.fusionFeedProvider);
};

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
OpenmixApplication.prototype.handleRequest = function(request, response) {
    var fusionData = this.parseFusionData(request.getData('fusion'));
    var availData = request.getProbe('avail');
    var reasons = [];
    if (!this.selectDefaultProvider(request, response, fusionData, availData, reasons)) {
        this.selectMarketAlternative(request, response, availData, reasons);
    }
    response.setReasonCode(reasons.join(';'));
};

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 * @param {!Object} fusionData
 * @param {!Object} availData
 * @param {!Array} reasons
 * @return {boolean}
 */
OpenmixApplication.prototype.selectDefaultProvider = function(request, response, fusionData, availData, reasons) {
    var sampleRateData = fusionData[this.__settings.fusionFeedProvider];
    var frequencyDataCountries = sampleRateData['countries'] || {};
    var likelyPOP = frequencyDataCountries[request.country];
    if (!likelyPOP) {
        reasons.push('unknown country (' + request.country + ')');
    }

    var defaultProviderIsAvailable = true;
    if (this.__settings.defaultProvider in availData) {
        var avail = availData[this.__settings.defaultProvider]['avail'];
        if (avail < this.__settings.availabilityThreshold) {
            defaultProviderIsAvailable = false;
            reasons.push('default unavailable');
        }
    }

    if (defaultProviderIsAvailable && likelyPOP) {
        var dateTimeString = getTruncatedDateString();
        //reasons.push(dateTimeString);
        var sampleRates = sampleRateData['periods'][dateTimeString];
        if (!sampleRates) {
            sampleRates = sampleRateData['default'];
            reasons.push('default sample rates');
        }
        var likelyPOPFrequency = sampleRates[likelyPOP];
        if ('undefined' !== typeof likelyPOPFrequency) {
            var random = 100 * Math.random();
            if (random < likelyPOPFrequency) {
                response.respond(this.__settings.defaultProvider, this.__settings.providers[this.__settings.defaultProvider].cname);
                response.setTTL(this.getAdjustedTTL(likelyPOPFrequency));
                reasons.push('default');
                return true;
            } else {
                reasons.push('default provider not sampled');
            }
        }
    }
    return false;
};

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 * @param {!Object} availData
 * @param {!Array} reasons
 */
OpenmixApplication.prototype.selectMarketAlternative = function(request, response, availData, reasons) {
    reasons.push('using market-weighted alternates');
    var weights = this.__settings.marketWeights[request.market] || this.__settings.defaultMarketWeights;
    var provider = this.selectObjectWithWeights(weights, reasons, availData);
    if (!provider) {
        provider = this.__settings.defaultProvider;
    }
    response.respond(provider, this.__settings.providers[provider].cname);
    response.setTTL(this.__settings.defaultTTL);
};

/**
 * @param {!Object.<string,number>} data
 * @param {!Array} reasons
 * @param {!Object} availData
 * @return {string|undefined}
 */
OpenmixApplication.prototype.selectObjectWithWeights = function(data, reasons, availData) {
    var total = 0;
    var keys = [];
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            var avail = availData[i]['avail'] || 0;
            if (avail >= this.__settings.availabilityThreshold) {
                keys.push(i);
                total += data[i];
            } else {
                reasons.push(i + ' unavailable');
            }
        }
    }
    if (total) {
        var random = total * Math.random();
        var found, runningTotal = 0;
        for (i = 0; i < keys.length && !found; i++) {
            var current = keys[i];
            runningTotal += data[current];
            if (random < runningTotal) {
                found = current;
            }
        }
        return found;
    }
};

/**
* @param {!Object} data
*/
OpenmixApplication.prototype.parseFusionData = function(data) {
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var currentKey = keys[i];
        var fusionCacheData = this.__fusionDataCache[currentKey] = this.__fusionDataCache[currentKey] || {};
        var currentString = data[currentKey];
        if (currentString === fusionCacheData['value']) {
            data[currentKey] = fusionCacheData['json'];
        } else {
            try {
                data[currentKey] = JSON.parse(currentString);
            } catch (e) {
                delete data[currentKey];
            }
        }
    }
    return data;
};

/**
 * @param {number} capacity
 * @return {number}
 */
OpenmixApplication.prototype.getAdjustedTTL = function(capacity) {
    var range = this.__settings.maxTTL - this.__settings.minTTL;
    var pct = capacity / 100;
    var extensionOverMin = range * pct;
    return Math.ceil(this.__settings.minTTL + extensionOverMin);
};

/* jshint unused:false */
/**
 * @param {!OpenmixConfig} config
 */
function init(config) {
    handler.handleInit(config);
}

/**
 * @param {!OpenmixRequest} request
 * @param {!OpenmixResponse} response
 */
function onRequest(request, response) {
    handler.handleRequest(request, response);
}
/* jshint unused:true */

/**
 * @param {string} value
 * @param {number} len
 * @param {string} padChar
 * @return {string}
 */
function padFront(value, len, padChar) {
    var result = value;
    while (len > result.length) {
        result = padChar + result;
    }
    return result;
}

function getTruncatedDateString() {
    var now = new Date();
    return now.getUTCFullYear()
        + '-' + padFront((1 + now.getUTCMonth()).toString(), 2, '0')
        + '-' + padFront(now.getUTCDate().toString(), 2, '0')
        + 'T' + padFront(now.getUTCHours().toString(), 2, '0');
}
