var handler = new OpenmixApplication({
    // The TTL to be set when the application chooses a geo provider.
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

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = [],
		externalProviders = {};

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {

		// Getting the external providers
    	externalProviders = config.getProviders();
    	aliases = Object.keys(externalProviders);
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var allReasons,
            decisionProvider,
            decisionReason;

        allReasons = {
            random_selection: 'A'
        };

        decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
        decisionReason = allReasons.random_selection;

        response.respond(decisionProvider, externalProviders[decisionProvider].response);
        response.setTTL(settings.default_ttl);
        response.setReasonCode(decisionReason);
    };

}
