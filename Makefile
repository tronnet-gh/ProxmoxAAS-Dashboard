.PHONY: test build build-wfa clean clean-wfa clean-web

build: clean ensure-dist build-wfa
	@echo "======================== Building Binary ======================="
# resolve symbolic links in web by copying it into dist/web/
	GODEBUG=embedfollowsymlinks=1 CGO_ENABLED=0 go build -tags release -ldflags="-s -w" -v -o dist/ .

test:
	GODEBUG=embedfollowsymlinks=1 CGO_ENABLED=0 go run .

clean: clean-wfa clean-web
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*

ensure-dist:
	mkdir -p dist

clean-web:

build-wfa:
	$(MAKE) -C WFA-JS
	cp -f WFA-JS/dist/* app/web/modules

clean-wfa:
	$(MAKE) clean -C WFA-JS