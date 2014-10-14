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
    failover_providers: {
        'foo_f': {
            cname: 'www.foo_f.com'
        },
        'bar_f': {
            cname: 'www.bar_f.com'
        },
        'baz_f': {
            cname: 'www.baz_f.com'
        }
    },
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    sonar_threshold: 90
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
    var failover_aliases = typeof settings.failover_providers === 'undefined' ? [] : Object.keys(settings.failover_providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }

        i = failover_aliases.length;

        while (i --) {
            config.requireProvider(failover_aliases[i]);
        }

    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var data_sonar  = parse_sonar_data(request.getData('sonar')),
            all_reasons,
            decision_provider,
            decision_ttl,
            candidates,
            candidate_aliases,
            reason_code,
            decision_cname;

        all_reasons = {
            primary_selected: 'A',
            failover_selected: 'B',
            default_selected: 'C'
        };

        function filter_primary_candidates(candidate, alias) {
            return (candidate >= settings.sonar_threshold)
                && (typeof settings.providers[alias] !== 'undefined');
        }

        function filter_failover_candidates(candidate, alias) {
            return (candidate >= settings.sonar_threshold)
                && (typeof settings.failover_providers[alias] !== 'undefined');
        }

        function select_random_provider(aliases, reason) {
            decision_provider = aliases[Math.floor(Math.random() * aliases.length)];
            reason_code = reason;
            decision_ttl = settings.default_ttl;
        }

        candidates = filter_object(data_sonar, filter_primary_candidates);

        candidate_aliases = Object.keys(candidates);

        if (candidate_aliases.length === 1) {
            decision_provider = candidate_aliases[0];
            reason_code = all_reasons.primary_selected;
            decision_ttl = decision_ttl || settings.default_ttl;
        } else if (candidate_aliases.length !== 0) {
            select_random_provider(aliases, all_reasons.primary_selected);
        }

        if (!decision_provider) {
            candidates = filter_object(data_sonar, filter_failover_candidates);

            candidate_aliases = Object.keys(candidates);

            if (candidate_aliases.length === 1) {
                decision_provider = candidate_aliases[0];
                decision_cname = settings.failover_providers[decision_provider].cname;
                reason_code = all_reasons.failover_selected;
                decision_ttl = decision_ttl || settings.default_ttl;
            } else if (candidate_aliases.length !== 0) {
                select_random_provider(failover_aliases, all_reasons.failover_selected);
                decision_cname = settings.failover_providers[decision_provider].cname;
            }
        }

        if (!decision_provider) {
            decision_provider = settings.default_provider;
            reason_code = all_reasons.default_selected;
            decision_ttl = decision_ttl || settings.default_ttl;
        }

        response.respond(decision_provider, decision_cname || settings.providers[decision_provider].cname);
        response.setTTL(decision_ttl);
        response.setReasonCode(reason_code);
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filter_object(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            data = [];

        while (i --) {
            key = keys[i];

            if (filter(object[key], key)) {
                data[key] = (object[key]);
            }
            /*
            if (!filter(object[key], key)) {
                delete object[key];
            }
            */
        }

        //return object;
        return data;
    }

    /**
     * @param {!Object} data
     */
    function parse_sonar_data(data) {
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
