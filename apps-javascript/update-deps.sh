#!/bin/bash

# Colors
yellow='\033[1;33m'
no_color='\033[0m'

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Breaking these into multiple functions in order to support custom versions of
# these files in some templates

copy_deps_js() {
    cd "${DIR}"
    echo -e "${yellow}Updating deps.js in template: ${1}${no_color}"
    cp template/test/deps.js ${1}/test/deps.js
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
copy_deps_js diagnostics
copy_deps_js fusion-cdn-avoid-bursting
copy_deps_js fusion-cdn-avoid-bursting-gb
copy_deps_js geo-with-overrides
copy_deps_js optimal-rtt
copy_deps_js thruput-with-rtt

echo
copy_package_json diagnostics
copy_package_json fusion-cdn-avoid-bursting
copy_package_json fusion-cdn-avoid-bursting-gb
copy_package_json geo-with-overrides
copy_package_json optimal-rtt
copy_package_json thruput-with-rtt

echo
copy_jshintConfig diagnostics
copy_jshintConfig fusion-cdn-avoid-bursting
copy_jshintConfig fusion-cdn-avoid-bursting-gb
copy_jshintConfig geo-with-overrides
copy_jshintConfig optimal-rtt
copy_jshintConfig thruput-with-rtt

echo
copy_jshintConfigTests diagnostics
copy_jshintConfigTests fusion-cdn-avoid-bursting
copy_jshintConfigTests fusion-cdn-avoid-bursting-gb
copy_jshintConfigTests geo-with-overrides
copy_jshintConfigTests optimal-rtt
copy_jshintConfigTests thruput-with-rtt

echo
copy_validate_js_sh diagnostics
copy_validate_js_sh fusion-cdn-avoid-bursting
copy_validate_js_sh fusion-cdn-avoid-bursting-gb
copy_validate_js_sh geo-with-overrides
copy_validate_js_sh optimal-rtt
copy_validate_js_sh thruput-with-rtt

echo
run_npm_and_execute_validate_js_and_tests diagnostics
run_npm_and_execute_validate_js_and_tests fusion-cdn-avoid-bursting
run_npm_and_execute_validate_js_and_tests fusion-cdn-avoid-bursting-gb
run_npm_and_execute_validate_js_and_tests geo-with-overrides
run_npm_and_execute_validate_js_and_tests optimal-rtt
run_npm_and_execute_validate_js_and_tests thruput-with-rtt
