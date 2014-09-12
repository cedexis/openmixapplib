
var handler;

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    /** @param {OpenmixConfiguration} config */
    this.do_init = function(config) {
        var i;
        if (settings.providers) {
            for (i = 0; i < settings.providers.length; i += 1) {
                config.requireProvider(settings.providers[i].alias);
            }
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        function flatten(obj, property) {
            var result = {}, i;
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (obj[i].hasOwnProperty(property) && obj[i][property]) {
                        result[i] = obj[i][property];
                    }
                }
            }
            return result;
        }

        function provider_from_alias(alias) {
            var i;
            for (i = 0; i < settings.providers.length; i += 1) {
                if (alias === settings.providers[i].alias) {
                    return settings.providers[i];
                }
            }
            return null;
        }

        // Application logic here
    };

}

handler = new OpenmixApplication({
    providers: [
        {
            alias: 'foo',
            cname: 'www.foo.com'
        },
        {
            alias: 'bar',
            cname: 'www.bar.com'
        }
    ],
    default_ttl: 20
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}
