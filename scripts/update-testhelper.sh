#!/bin/sh

# Figure out where this script file is so that the `apps` directory can be
# conclusively found. Thanks to
# http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ] ; do SOURCE="$(readlink "$SOURCE")"; done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# Update all of the apps using `template/tests/TestHelper.php` as the source of truth
ls $DIR/../apps/ | grep -v template | xargs -I \{\} cp $DIR/../apps/template/tests/TestHelper.php $DIR/../apps/\{\}/tests/TestHelper.php
