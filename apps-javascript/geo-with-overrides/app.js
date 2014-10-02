
var handler;

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i;
        for (i = 0; i < settings.providers.length; i += 1) {
            config.requireProvider(settings.providers[i].alias);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var all_reasons,
            decision_provider,
            decision_reasons = [],
            decision_ttl;

        function provider_from_alias(alias) {
            var i;
            for (i = 0; i < settings.providers.length; i += 1) {
                if (alias === settings.providers[i].alias) {
                    return settings.providers[i];
                }
            }
            return null;
        }

        all_reasons = {
            got_expected_market: 'A',
            geo_override_on_country: 'B',
            unexpected_market: 'C'
        };

        if (settings.country_overrides) {
            if (settings.country_overrides[request.country]) {
                // Override based on the request country
                decision_provider = provider_from_alias(settings.country_overrides[request.country]);
                decision_ttl = decision_ttl || settings.default_ttl;
                decision_reasons.push(all_reasons.geo_override_on_country);
            }
        }

        if (!decision_provider) {
            if (settings.market_to_provider[request.market]) {
                // Override based on the request market
                decision_provider = provider_from_alias(settings.market_to_provider[request.market]);
                decision_ttl = decision_ttl || settings.default_ttl;
                decision_reasons.push(all_reasons.got_expected_market);
            }
        }


        if (!decision_provider) {
            decision_provider = provider_from_alias(settings.default_provider);
            decision_ttl = decision_ttl || settings.error_ttl;
            decision_reasons.push(all_reasons.unexpected_market);
        }

        response.respond(decision_provider.alias, decision_provider.cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reasons.join(','));
    };
}

handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: [
        {
            alias: 'foo',
            cname: 'www.foo.com'
        },
        {
            alias: 'bar',
            cname: 'www.bar.com'
        },
        {
            alias: 'baz',
            cname: 'www.baz.com'
        }
    ],
    // A mapping of ISO 3166-1 country codes to provider aliases
    country_overrides: {},
    // A mapping of market codes to provider aliases
    market_to_provider: {},
    // Selected if a provider can't be determined
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}
