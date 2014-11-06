#!/bin/bash

# Colors
yellow='\033[1;33m'
no_color='\033[0m'

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Breaking these into multiple functions in order to support custom versions of
# these files in some templates

update() {
    cd "${DIR}"

    # Clear the test/resources directory
    rm ${1}/test/resources/*
    cp template/test/test.html ${1}/test/
    cp template/test/resources/* ${1}/test/resources/
    cp template/karma.app.conf.js ${1}/

    echo -e "${yellow}Updating openmix-externs.js in template: ${1}${no_color}"
    cp template/test/openmix-externs.js ${1}/test/

    echo -e "${yellow}Updating package.json in template: ${1}${no_color}"
    cp template/package.json ${1}/

    echo -e "${yellow}Updating jshintConfig.json in template: ${1}${no_color}"
    cp template/jshintConfig.json ${1}/

    echo -e "${yellow}Updating test/jshintConfigTests.json in template: ${1}${no_color}"
    cp template/test/jshintConfigTests.json ${1}/test/

    echo -e "${yellow}Updating validate-js.sh in template: ${1}${no_color}"
    cp template/validate-js.sh ${1}/validate-js.sh

    echo -e "${yellow}Updating .gitignore in template: ${1}${no_color}"
    cp template/.gitignore ${1}/

    echo -e "${yellow}Executing validate-js.sh in template: ${1}${no_color}"
    cd "${1}"
    npm install
    ./validate-js.sh
    ./run-tests.sh
}

echo
update diagnostics
update fusion-cdn-avoid-bursting
update fusion-custom-get-json
update geo-with-overrides
update geo-with-overrides+sonar
update load-external-config
update new-relic
update optimal-rtt
update ortt+fusion-health
update ortt+sonar
update round-robin-failover
update thruput-with-rtt
