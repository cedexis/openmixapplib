module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',

    // frameworks to use
    frameworks: [ 'qunit' ],

    plugins: [
        'karma-qunit',
        'karma-phantomjs-launcher',
        'karma-junit-reporter'
    ],

    // list of files / patterns to load in the browser
    files: [
        'test/resources/sinon-1.11.1.js',
        'test/resources/sinon-qunit-1.0.0.js',
        'app.js',
        'test/tests.js'
    ],

    // list of files to exclude
    exclude: [

    ],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: [
        'progress',
        'junit'
    ],

    junitReporter: {
        outputFile: 'karma.app.results.xml'
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    // Useful for troubleshooting issues with Karma configuration
    //logLevel: config.LOG_DEBUG,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: [ 'PhantomJS' ],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 6000,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true
  });
};
