#!/bin/bash

# Colors
yellow='\033[1;33m'
no_color='\033[0m'

# Change to the project root directory
cd "$( dirname "${BASH_SOURCE[0]}" )"

copy_deps_js() {
    echo -e "${yellow}Updating $1/test/deps.js${no_color}"
    cp template/test/deps.js $1/test/deps.js
    $1/validate-js.sh
}

echo
copy_deps_js diagnostics
copy_deps_js fusion-cdn-avoid-bursting-gb
copy_deps_js fusion-cdn-avoid-bursting-mbps
copy_deps_js geo-with-overrides
copy_deps_js optimal-rtt
copy_deps_js thruput-with-rtt
