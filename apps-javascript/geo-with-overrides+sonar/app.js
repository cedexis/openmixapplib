var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
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
    // A mapping of ISO 3166-1 country codes to provider aliases
    //country_to_provider: { 'UK': 'bar', 'ES': 'baz' },
    country_to_provider: {},
    // A mapping of market codes to provider aliases
    //market_to_provider: { 'EG': 'foo' }
    market_to_provider: {},
    // Selected if a provider can't be determined
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20,

    // sonar values are between 0 - 1
    sonar_threshold: 0.9

});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = typeof settings.providers === 'undefined' ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataSonar  = parseSonarData( request.getData('sonar') ),
            all_reasons,
            decision_provider,
            decision_reason,
            failedCandidates,
            decision_ttl;

        all_reasons = {
            got_expected_market: 'A',
            geo_override_on_country: 'B',
            unexpected_market: 'C',
            geo_sonar_failed: 'D',
            no_available_provider: 'E'
        };

        // determine which providers have a sonar value below threshold
        function belowSonarThreshold(sonarValue, alias) {
            if( dataSonar[alias] !== 'undefined') {
                return (sonarValue < settings.sonar_threshold)
                    && (typeof settings.providers[alias] !== 'undefined');
            }
        }

        // used for reason code logging
        function failedGeoLocation() {
            if( failedCandidates.length > 0) {
                if (typeof settings.country_to_provider !== 'undefined'
                    && typeof settings.country_to_provider[request.country] !== 'undefined' 
                    && failedCandidates[settings.country_to_provider[request.country]] !== 'undefined') {
                    return true;
                }

                if (typeof settings.market_to_provider !== 'undefined'
                    && typeof settings.market_to_provider[request.market] !== 'undefined' 
                    && failedCandidates[settings.market_to_provider[request.market] ] !== 'undefined') {
                    return true;
                }
            }

            return false;
        }

        function getDefaultProvider() {   
            // the default provider is good, use it          
            if( failedCandidates.length === 0 || typeof failedCandidates[settings.default_provider] === 'undefined') {
                return settings.default_provider;
            }

            // get the first available provider where sonar value is good
            var keys = Object.keys(settings.providers),
                i = keys.length,
                key;

            while (i --) {
                key = keys[i];

                if (typeof failedCandidates[key] === 'undefined') {
                    return key;
                }
            }

            // log no available providers and return the default_provider
            decision_reason = all_reasons.no_available_provider + all_reasons.unexpected_market;
            return settings.default_provider;

        }

        failedCandidates = filterObject(dataSonar, belowSonarThreshold);

        /* jshint laxbreak:true */
        if (typeof settings.country_to_provider !== 'undefined'
            && typeof settings.country_to_provider[request.country] !== 'undefined' 
            && typeof failedCandidates[settings.country_to_provider[request.country]] === 'undefined') {
            // Override based on the request country
            decision_provider = settings.country_to_provider[request.country];
            decision_ttl = decision_ttl || settings.default_ttl;
            decision_reason = all_reasons.geo_override_on_country;
        }
        else if (typeof settings.market_to_provider !== 'undefined'
            && typeof settings.market_to_provider[request.market] !== 'undefined'
            && typeof failedCandidates[settings.market_to_provider[request.market] ] === 'undefined') {
            // Override based on the request market
            decision_provider = settings.market_to_provider[request.market];
            decision_ttl = decision_ttl || settings.default_ttl;
            decision_reason = all_reasons.got_expected_market;
        }
        else {

            decision_provider = getDefaultProvider();
            decision_ttl = decision_ttl || settings.error_ttl;
            if( failedGeoLocation() ) {
                decision_reason = all_reasons.geo_sonar_failed + all_reasons.unexpected_market;
            }else if(typeof decision_reason === 'undefined') {
                decision_reason = all_reasons.unexpected_market;
            }
        }
        /* jshint laxbreak:false */

        response.respond(decision_provider, settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reason);
    };

     function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            data = {};

        while (i --) {
            key = keys[i];

            if (filter(object[key], key)) {
                data[key] = (object[key]);
            }
        }

        return data;
    }

    /**
     * @param {!Object} data
     */
    function parseSonarData(data) {
        var keys = Object.keys(data),
            i = keys.length,
            key;
        while (i --) {
            key = keys[i];
            try {
                data[key] = JSON.parse(data[key]);
            }
            catch (e) {
                delete data[key];
            }
        }
        return data;
    }
}
