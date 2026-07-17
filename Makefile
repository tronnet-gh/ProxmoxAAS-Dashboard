.PHONY: build test clean wfa-js

build: clean build-wfa-js
	@echo "======================== Building Binary ======================="
	mkdir -p dist
# resolve symbolic links in web by copying it into dist/web/
	cp -rL web/ dist/web/
	CGO_ENABLED=0 go build -tags release -ldflags="-s -w" -v -o dist/ .

build-wfa-js:
	$(MAKE) -C WFA-JS
	cp -f WFA-JS/dist/* web/modules

clean: clean-wfa-js
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*

clean-wfa-js:
	$(MAKE) clean -C WFA-JS
