#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
phpunit "${DIR}/tests/OpenmixAppTest.php"
