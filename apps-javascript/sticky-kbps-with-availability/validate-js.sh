#!/bin/bash

# Colors
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[1;33m'
cyan='\033[0;36m'
no_color='\033[0m'

# Change to the project root directory

echo -e "${cyan}Validating with JSHint${red}"
echo
node_modules/jshint/bin/jshint --config jshintConfig.json app.js
node_modules/jshint/bin/jshint --config test/jshintConfigTests.json test/tests.js
echo -e "${no_color}"
