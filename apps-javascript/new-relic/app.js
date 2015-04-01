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
        }
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
     * This application is very simple in order to highlight the New
     * Relic-specific parts of the functionality. If the CPU for "foo"
     * is over 1.0 then all traffic is sent to "bar". Otherwise the
     * destination is selected at random.
     *
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataFusion = parseFusionData(request.getData('fusion')),
            decisionProvider,
            decisionReason,
            decisionTtl,
            allReasons;
        
        allReasons = {
            first_provider: 'A',
            random_provider: 'B'
        };

        function selectRandomProvider() {
            decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
            decisionTtl = decisionTtl || settings.error_ttl;
            decisionReason = allReasons.random_provider;
        }

        if (dataFusion[aliases[0]] !== undefined
            && dataFusion[aliases[0]].value !== undefined
            && dataFusion[aliases[0]].value > 1.0) {
            decisionProvider = aliases[1];
            decisionTtl = decisionTtl || settings.default_ttl;
            decisionReason = allReasons.first_provider;
        } else {
            selectRandomProvider();
        }

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReason);
    };

    /**
     * @param {!Object} data
     */
    function parseFusionData(data) {
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
