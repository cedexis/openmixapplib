#!/bin/bash

# Colors
yellow='\033[1;33m'
no_color='\033[0m'

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Breaking these into multiple functions in order to support custom versions of
# these files in some templates

copy_openmix_externs_js() {
    cd "${DIR}"
    echo -e "${yellow}Updating openmix-externs.js in template: ${1}${no_color}"
    cp template/test/openmix-externs.js ${1}/test/openmix-externs.js
}

copy_package_json() {
    cd "${DIR}"
    echo -e "${yellow}Updating package.json in template: ${1}${no_color}"
    cp template/package.json ${1}/package.json
}

copy_jshintConfig() {
    cd "${DIR}"
    echo -e "${yellow}Updating jshintConfig.json in template: ${1}${no_color}"
    cp template/jshintConfig.json ${1}/jshintConfig.json
}

copy_jshintConfigTests() {
    cd "${DIR}"
    echo -e "${yellow}Updating test/jshintConfigTests.json in template: ${1}${no_color}"
    cp template/test/jshintConfigTests.json ${1}/test/jshintConfigTests.json
}

copy_validate_js_sh() {
    cd "${DIR}"
    echo -e "${yellow}Updating validate-js.sh in template: ${1}${no_color}"
    cp template/validate-js.sh ${1}/validate-js.sh
}

run_npm_and_execute_validate_js_and_tests() {
    cd "${DIR}"
    echo -e "${yellow}Executing validate-js.sh in template: ${1}${no_color}"
    cd "${1}"
    npm install
    ./validate-js.sh
    ./run-tests.sh
}

echo
copy_openmix_externs_js diagnostics
copy_openmix_externs_js fusion-cdn-avoid-bursting
copy_openmix_externs_js fusion-cdn-avoid-bursting-gb
copy_openmix_externs_js geo-with-overrides
copy_openmix_externs_js optimal-rtt
copy_openmix_externs_js thruput-with-rtt
copy_openmix_externs_js load-external-config
copy_openmix_externs_js new-relic
copy_openmix_externs_js round-robin-failover

echo
copy_package_json diagnostics
copy_package_json fusion-cdn-avoid-bursting
copy_package_json fusion-cdn-avoid-bursting-gb
copy_package_json geo-with-overrides
copy_package_json optimal-rtt
copy_package_json thruput-with-rtt
copy_package_json load-external-config
copy_package_json new-relic
copy_package_json round-robin-failover

echo
copy_jshintConfig diagnostics
copy_jshintConfig fusion-cdn-avoid-bursting
copy_jshintConfig fusion-cdn-avoid-bursting-gb
copy_jshintConfig geo-with-overrides
copy_jshintConfig optimal-rtt
copy_jshintConfig thruput-with-rtt
copy_jshintConfig load-external-config
copy_jshintConfig new-relic
copy_jshintConfig round-robin-failover

echo
copy_jshintConfigTests diagnostics
copy_jshintConfigTests fusion-cdn-avoid-bursting
copy_jshintConfigTests fusion-cdn-avoid-bursting-gb
copy_jshintConfigTests geo-with-overrides
copy_jshintConfigTests optimal-rtt
copy_jshintConfigTests thruput-with-rtt
copy_jshintConfigTests load-external-config
copy_jshintConfigTests new-relic
copy_jshintConfigTests round-robin-failover

echo
copy_validate_js_sh diagnostics
copy_validate_js_sh fusion-cdn-avoid-bursting
copy_validate_js_sh fusion-cdn-avoid-bursting-gb
copy_validate_js_sh geo-with-overrides
copy_validate_js_sh optimal-rtt
copy_validate_js_sh thruput-with-rtt
copy_validate_js_sh load-external-config
copy_validate_js_sh new-relic
copy_validate_js_sh round-robin-failover

echo
run_npm_and_execute_validate_js_and_tests diagnostics
run_npm_and_execute_validate_js_and_tests fusion-cdn-avoid-bursting
run_npm_and_execute_validate_js_and_tests fusion-cdn-avoid-bursting-gb
run_npm_and_execute_validate_js_and_tests geo-with-overrides
run_npm_and_execute_validate_js_and_tests optimal-rtt
run_npm_and_execute_validate_js_and_tests thruput-with-rtt
run_npm_and_execute_validate_js_and_tests load-external-config
run_npm_and_execute_validate_js_and_tests new-relic
run_npm_and_execute_validate_js_and_tests round-robin-failover
