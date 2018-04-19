COMPILER?=node_modules/google-closure-compiler/compiler.jar
JSHINT?=node_modules/jshint/bin/jshint
KARMA?=node_modules/karma/bin/karma
COFFEE?=node_modules/coffeescript/bin/coffee

.PHONY: test

clean:
	@rm -rf build

build: clean
	@mkdir build
	$(COFFEE) -c -b netmask.coffee
	@cat app.js netmask.js > build/app.js

validate-javascript:
	@java -jar $(COMPILER) \
	--js app.js \
	--externs externs.js \
	--language_in ECMASCRIPT5 \
	--js_output_file /dev/null \
	--warning_level VERBOSE

	@$(JSHINT) --config jshint.json app.js

test: build
	$(KARMA) start karma.app.conf.js
