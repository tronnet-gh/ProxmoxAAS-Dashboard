.PHONY: build test clean

build: clean
	@echo "======================== Building Binary ======================="
# resolve symbolic links in web by copying it into dist/web/
	cp -rL web/ dist/web/
	CGO_ENABLED=0 go build -ldflags="-s -w" -v -o dist/ .

test: clean
	go run .

clean:
	@echo "======================== Cleaning Project ======================"
	go clean
	rm -rf dist/*
