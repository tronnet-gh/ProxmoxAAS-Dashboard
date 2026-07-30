.PHONY: build test clean wfa-js

build: clean ensure-dist build-web build-wfa-js
	@echo "======================== Building Binary ======================="
# resolve symbolic links in web by copying it into dist/web/
	CGO_ENABLED=0 go build -tags release -ldflags="-s -w" -v -o dist/ .

build-web: ensure-dist
	cp -rL web/ dist/web/

build-wfa-js: ensure-dist
	$(MAKE) -C WFA-JS
	cp -f WFA-JS/dist/* web/modules

clean: clean-wfa-js
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*

clean-wfa-js:
	$(MAKE) clean -C WFA-JS

ensure-dist:
	mkdir -p dist

workflow-init: ensure-dist build-web
