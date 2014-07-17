/*global
*/

var handler;

function OpenmixApplication() {
    'use strict';

    this.providers = {
        'cdn1': {
            cname: 'cdn1.com'
        },
        'cdn2': {
            cname: 'cdn2.com'
        },
        'origin': {
            cname: 'origin.example.com'
        }
    };

    this.avail_threshold = 90.0;
    this.tie_threshold = 0.95;
    this.ttl = 20;

    this.get_random = function() {
        return Math.random();
    };

    this.do_init = function(config) {
        var i;
        for (i in this.providers) {
            if (this.providers.hasOwnProperty(i)) {
                if (this.providers[i]) {
                    config.requireProvider(i);
                }
            }
        }
    };

    this.handle_request = function(request, response) {

        var candidates,
            avail,
            avail_candidates,
            kbps,
            kbps_candidates,
            rtt,
            rtt_candidates,
            selected_alias,
            reason,
            avail_threshold = this.avail_threshold;

        function sort_fun(left, right) {
            if (left[1] < right[1]) {
                return -1;
            }
            if (left[1] === right[1]) {
                return 0;
            }
            return 1;
        }

        function sort_reversed_fun(left, right) {
            if (left[1] < right[1]) {
                return 1;
            }
            if (left[1] === right[1]) {
                return 0;
            }
            return -1;
        }

        function get_most_available() {
            var result = [], i;
            for (i in avail) {
                if (avail.hasOwnProperty(i)) {
                    result.push([ i, avail[i] ]);
                }
            }
            result.sort(sort_reversed_fun);
            return result;
        }

        function make_fun_filter_scores_by_availability(container) {
            return function(current, alias) {
                if (container.hasOwnProperty(alias)) {
                    current.push([ alias, container[alias] ]);
                }
                return current;
            };
        }

        function reduce_rtt_by_kbps_candidates(current, alias) {
            var i;
            for (i = 0; i < kbps_candidates.length; i += 1) {
                if (alias === kbps_candidates[i][0]) {
                    current.push([ alias, rtt[alias] ]);
                    break;
                }
            }
            return current;
        }

        function empty(obj) {
            return 1 > Object.keys(obj).length;
        }

        function properties_array(container, fun) {
            var i, result = [];
            for (i in container) {
                if (container.hasOwnProperty(i)) {
                    if (fun.call(null, i)) {
                        result.push(i);
                    }
                }
            }
            return result;
        }

        function select_random(that) {
            var aliases = Object.keys(that.providers),
                min = 0,
                max = aliases.length - 1,
                random_int = Math.floor(that.get_random() * (max - min + 1)) + min;
            //console.log('Random int: ' + random_int);
            return aliases[random_int];
        };

        avail = request.getProbe('avail');

        // First figure out the available platforms
        candidates = properties_array(avail, function(i) {
            return (avail[i] && (avail_threshold <= avail[i]));
        });
        //console.log('Available candidates: ' + JSON.stringify(candidates));

        if (1 >= candidates.length) {
            // If one or fewer candidates are available, then select the least bad
            avail_candidates = get_most_available();
            if (0 < avail_candidates.length) {
                selected_alias = avail_candidates[0][0];
            } else {
                selected_alias = select_random(this);
            }
            reason = 'D';
        } else {
            kbps = request.getProbe('http_kbps');
            rtt = request.getProbe('http_rtt');
            //console.log('Raw KBPS data: ' + JSON.stringify(kbps));
            //console.log('Raw RTT data: ' + JSON.stringify(rtt));
            if (!empty(kbps)) {
                kbps_candidates = candidates.reduce(make_fun_filter_scores_by_availability(kbps), []);
                //console.log('KBPS (filtered by candidates): ' + JSON.stringify(kbps_candidates));
                if (1 < kbps_candidates.length) {
                    // See if the two fastest providers are close enough to be considered a tie
                    kbps_candidates.sort(sort_reversed_fun);
                    //console.log('KBPS (reverse order): ' + JSON.stringify(kbps_candidates));
                    rtt_candidates = candidates.reduce(reduce_rtt_by_kbps_candidates, []);
                    //console.log('RTT (filtered by KBPS candidates): ' + JSON.stringify(rtt_candidates));
                    if ((kbps_candidates[0][1] * this.tie_threshold <= kbps_candidates[1][1]) && !empty(rtt_candidates)) {
                        //console.log('Tie.  Select provider with the fastest RTT that also has KBPS data');
                        rtt_candidates.sort(sort_fun);
                        //console.log('RTT (sorted): ' + JSON.stringify(rtt_candidates));
                        selected_alias = rtt_candidates[0][0];
                        reason = 'B';
                    } else {
                        //console.log('Not a tie or only one provider with KBPS data available');
                        //console.log('Selecting the provider with the fastest KBPS score');
                        selected_alias = kbps_candidates[0][0];
                        reason = 'A';
                    }
                } else {
                    selected_alias = candidates[0];
                    reason = 'A';
                }
            } else if (!empty(rtt)) {
                //console.log('No KBPS data but we do have RTT to work with');
                rtt_candidates = candidates.reduce(make_fun_filter_scores_by_availability(rtt), []);
                //console.log('RTT (filtered by candidates): ' + JSON.stringify(rtt_candidates));
                rtt_candidates.sort(sort_fun);
                //console.log('RTT (sorted): ' + JSON.stringify(rtt_candidates));
                selected_alias = rtt_candidates[0][0];
                reason = 'B';
            } else {
                selected_alias = select_random(this);
                reason = 'C';
            }
        }

        response.respond(selected_alias, this.providers[selected_alias].cname);
        response.setTTL(this.ttl);
        response.setReasonCode(reason);
        //console.log(this.providers);
    };

}

handler = new OpenmixApplication();

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}
