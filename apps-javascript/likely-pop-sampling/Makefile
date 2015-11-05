
.PHONY: test

test:
	@node_modules/karma/bin/karma start karma.conf.js

validate:
	@java -jar node_modules/google-closure-compiler/compiler.jar --js app.js --externs externs.js --js_output_file /dev/null --warning_level VERBOSE
	@node_modules/jshint/bin/jshint --config jshint.json app.js
