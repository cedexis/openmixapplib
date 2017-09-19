var handler = new OpenmixApplication({
    providers: {
        'foo': {
            'cname': 'www.foo.com'
        },
        'bar': {
            'cname': 'www.bar.com'
        }
    },
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

    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

    /** @param {OpenmixConfiguration} config */
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
        // Application logic here
    };

    /**
     * @param {!Object} object
     * @param {Function} filter
     */
	function filterObject(object, filter) {
		var keys = Object.keys(object),
			i = keys.length,
			key,
			candidates = {};

		while (i --) {
			key = keys[i];

			if (filter(object[key], key)) {
				candidates[key] = object[key];
			}
		}

		return candidates;
	}

    /**
     * @param {Object} candidate
     */
    function filterEmpty(candidate) {
        for (var key in candidate) {
            return true;
        }
        return false;
    }

    /**
     * @param {!Object} source
     * @param {String} property
     */
    function getLowest(source, property) {
        var keys = Object.keys(source),
            i = keys.length,
            key,
            candidate,
            min = Infinity,
            value;

        while (i --) {
            key = keys[i];
            value = source[key][property];

            if (value < min) {
                candidate = key;
                min = value;
            }
        }

        return candidate;
    }
}
