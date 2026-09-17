.PHONY: install install-native build test typecheck clean

install:
	npm install

install-native:
	./scripts/install-native.sh

build:
	node scripts/build-rules.mjs
	node scripts/build.mjs

test:
	npm test

typecheck:
	npm run typecheck

clean:
	rm -rf dist extension/src/generated
