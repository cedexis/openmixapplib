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
    geo_order: ['asn', 'state', 'country', 'market'],
    geo_override: {
        // A mapping of market codes to provider aliases
        // market: { 'EG': 'foo' }
        'market': {},
        // A mapping of ISO 3166-1 country codes to provider aliases
        // country: { 'UK': 'bar', 'ES': 'baz' },
        'country': {},
        // A mapping of state codes to provider aliases
        // state: { 'US-S-AR': 'bar' },
        'state': {},
        // A mapping of ASN codes to provider aliases
        // asn: { '1234': 'bar', '4567': 'baz' },
        'asn': {}
    },
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

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

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
        var allReasons,
            decisionProvider,
            decisionReason,
            decisionTtl = settings.default_ttl;

        allReasons = {
            geo_override_on_market: 'A',
            geo_override_on_country: 'B',
            geo_override_on_state: 'C',
            geo_override_on_asn: 'D',
            default_provider: 'E'
        };

        function getGeoOverride() {
            var i, geoType, geo, geoOverride;

            for (i = 0; i < settings.geo_order.length; i ++) {
                geoType = settings.geo_order[i];
                geo = request[geoType];
                geoOverride = settings.geo_override[geoType];

                if (geoOverride !== undefined && geoOverride[geo] !== undefined) {
                    decisionReason = allReasons['geo_override_on_' + geoType];
                    return geoOverride[geo];
                }
            }
            return false;
        }

        decisionProvider = getGeoOverride();

        if (!decisionProvider) {
            decisionProvider = settings.default_provider;
            decisionTtl = settings.error_ttl;
            decisionReason = allReasons.default_provider;
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReason);
    };
}
