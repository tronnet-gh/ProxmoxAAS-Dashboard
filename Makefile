.PHONY: build build-web build-wfa clean clean-wfa clean-web

build: clean ensure-dist build-wfa build-web
	@echo "======================== Building Binary ======================="
# resolve symbolic links in web by copying it into dist/web/
	CGO_ENABLED=0 go build -tags release -ldflags="-s -w" -v -o dist/ .

clean: clean-wfa clean-web
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*

ensure-dist:
	mkdir -p dist

build-web: ensure-dist
	cp -rL web/ dist/web/

clean-web:

build-wfa:
	$(MAKE) -C WFA-JS
	cp -f WFA-JS/dist/* web/modules

clean-wfa:
	$(MAKE) clean -C WFA-JS