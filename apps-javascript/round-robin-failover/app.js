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
    var failoverAliases = typeof settings.failover_providers === 'undefined' ? [] : Object.keys(settings.failover_providers);
    this.lastAliasIndex = -1;
    this.lastFailoverAliasIndex = -1;

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }

        i = failoverAliases.length;

        while (i --) {
            config.requireProvider(failoverAliases[i]);
        }

    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var dataSonar  = parseSonarData(request.getData('sonar')),
            allReasons,
            decisionProvider,
            decisionTtl,
            candidates,
            candidateAliases,
            reasonCode,
            decisionCname;

        allReasons = {
            primary_selected: 'A',
            failover_selected: 'B',
            default_selected: 'C'
        };

        function filterPrimaryCandidates(candidate, alias) {
            return (candidate >= settings.sonar_threshold)
                && (typeof settings.providers[alias] !== 'undefined');
        }

        function filterFailoverCandidates(candidate, alias) {
            return (candidate >= settings.sonar_threshold)
                && (typeof settings.failover_providers[alias] !== 'undefined');
        }

        function selectProvider(aliases, reason, lastIndex) {
            if (lastIndex >= aliases.length) {
                lastIndex = -1;
            }
            decisionProvider = aliases[++lastIndex];
            reasonCode = reason;
            decisionTtl = settings.default_ttl;
            return lastIndex;
        }

        candidates = filterObject(dataSonar, filterPrimaryCandidates);

        candidateAliases = Object.keys(candidates);

        if (candidateAliases.length === 1) {
            decisionProvider = candidateAliases[0];
            reasonCode = allReasons.primary_selected;
            decisionTtl = decisionTtl || settings.default_ttl;
        } else if (candidateAliases.length !== 0) {
            this.lastAliasIndex = selectProvider(aliases, allReasons.primary_selected, this.lastAliasIndex);
        }

        if (!decisionProvider) {
            candidates = filterObject(dataSonar, filterFailoverCandidates);

            candidateAliases = Object.keys(candidates);

            if (candidateAliases.length === 1) {
                decisionProvider = candidateAliases[0];
                decisionCname = settings.failover_providers[decisionProvider].cname;
                reasonCode = allReasons.failover_selected;
                decisionTtl = decisionTtl || settings.default_ttl;
            } else if (candidateAliases.length !== 0) {
                this.lastFailoverAliasIndex = selectProvider(failoverAliases, allReasons.failover_selected, this.lastFailoverAliasIndex);
                decisionCname = settings.failover_providers[decisionProvider].cname;
            }
        }

        if (!decisionProvider) {
            decisionProvider = settings.default_provider;
            reasonCode = allReasons.default_selected;
            decisionTtl = decisionTtl || settings.default_ttl;
        }

        response.respond(decisionProvider, decisionCname || settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(reasonCode);
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
    function filterObject(object, filter) {
        var keys = Object.keys(object),
            i = keys.length,
            key,
            data = [];

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
