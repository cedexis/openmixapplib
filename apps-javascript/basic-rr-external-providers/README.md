#

## Description



## Validating the Code

The validate-js.sh script looks for possible errors in the application and test
code.  You must have Java installed for it to run.  It executes both the Google
Closure compiler and JSLint (jslint4java).

Here's an example where Google Closure compiler detects a misspelled property
name, and JSLint detects that we forgot to comment-out a console print
statement.  We'd want to fix these issues before uploading the Openmix app.

    $ ./validate-js.sh

    Validating with Google Closure Compiler

    app.js:171: WARNING - Property geo_default_on_marketasdf never defined on all_reasons
                        decision_reasons.push(all_reasons.geo_default_on_marketasdf);
                                              ^

    0 error(s), 1 warning(s), 65.1% typed

    Validating with JSLint

    jslint:app.js:17:13:'console' was used before it was defined.

## Running Unit Tests

Unit tests are a great way to make sure your application runs properly.  Given
an adequate understanding of the Openmix API, you can write tests to simulate
most runtime conditions.

Unit tests are found in the test/tests.js file.

There are two different ways to execute the unit tests.  The simplest is to open
the test/test.html file in your browser (e.g. file:///path/to/test/test.html).
Google Chrome works well for this.  You can use the Chrome Developer Tools to
debug any failed tests.

Another way to run the unit tests is on the command line using Karma Runner and
PhantomJS.  This requires that you have Node.js installed.  It's a little more
work to set up, but probably worthwhile in the long run if you anticipate writing
a lot of Openmix code.

You can run the run-tests.sh script provided to execute the tests in Karma
Runner.  Here's an example:

    $ ./run-tests.sh

    Running Openmix application unit tests

    INFO [karma]: Karma v0.10.10 server started at http://localhost:9876/
    INFO [launcher]: Starting browser PhantomJS
    INFO [PhantomJS 1.9.7 (Mac OS X)]: Connected on socket KHoK6W4HH8YDwj9EHCSk
    LOG: Object{requireProvider: requireProvider}
    LOG: Object{request: Object{getProbe: getProbe}, getProbe: getProbe, respond: respond, setTTL: setTTL, setReasonCode: setReasonCode}
    LOG: Object{request: Object{getProbe: getProbe}, getProbe: getProbe, respond: respond, setTTL: setTTL, setReasonCode: setReasonCode}
    ...
    PhantomJS 1.9.7 (Mac OS X): Executed 12 of 12 SUCCESS (0.075 secs / 0.017 secs)

    All unit tests passed

### Installing Node.js

Node.js is used by Karma Runner to run and execute your test code.

#### On Mac OS X

There are two good options for installing Node on Mac OS X.  You can download
an installer from [nodejs.org](http://nodejs.org/download/).  Or via
[Homebrew](https://github.com/Homebrew/homebrew/blob/master/README.md).

With Homebrew,

    $ brew install node

#### On Linux (Ubuntu)

Installing Node.js on Ubuntu is simple, but requires an extra package that users
sometimes miss:

    $ sudo apt-get install nodejs nodejs-legacy

### Installing Karma and other dependencies

With Node.js installed you can use *npm*, the package manager for Node.js, to
install Karma Runner and other dependencies.  The project directory contains a
package.json file, which npm uses to download and install software locally.

From the directory containing package.json:

    $ npm install
