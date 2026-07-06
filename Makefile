.PHONY: build test clean wfa-js

build: clean wfa-js
	@echo "======================== Building Binary ======================="
# resolve symbolic links in web by copying it into dist/web/
	cp -rL web/ dist/web/
	CGO_ENABLED=0 go build -tags release -ldflags="-s -w" -v -o dist/ .

wfa-js:
	$(MAKE) -C WFA-JS
	cp -f WFA-JS/dist/* web/modules

test: clean
	go run .

clean:
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*
