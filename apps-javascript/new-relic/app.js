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

    var reasons = {
        first_provider: 'A',
        random_provider: 'B'
    };

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
     * This application is very simple in order to highlight the New
     * Relic-specific parts of the functionality. If the CPU for "foo"
     * is over 1.0 then all traffic is sent to "bar". Otherwise the
     * destination is selected at random.
     *
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var data_fusion = request.getData('fusion'),
            decision_provider,
            decision_reason,
            decision_ttl;

        data_fusion =  parse_fusion_data(data_fusion);

        function select_random_provider() {
            decision_provider = aliases[Math.floor(Math.random() * aliases.length)];
            decision_ttl = decision_ttl || settings.error_ttl;
            decision_reason = reasons.random_provider;
        }

        if (typeof data_fusion[aliases[0]] !== 'undefined'
            && typeof data_fusion[aliases[0]].value !== 'undefined'
            && data_fusion[aliases[0]].value > 1.0) {
            decision_provider = aliases[1];
            decision_ttl = decision_ttl || settings.default_ttl;
            decision_reason = reasons.first_provider;
        } else {
            select_random_provider();
        }

        response.respond(decision_provider, settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(decision_reason);
    };

    /**
     * @param {string} data
     */
    function parse_fusion_data(data) {
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