//go:build !release

package common

import (
	"io"

	"github.com/tdewolff/minify/v2"
)

// defines mime type and associated minifier
type MimeType struct {
	Type     string
	Minifier func(m *minify.M, w io.Writer, r io.Reader, params map[string]string) error
}

// debug mime types
var MimeTypes = map[string]MimeType{
	"css": {
		Type:     "text/css",
		Minifier: nil,
	},
	"html": {
		Type:     "text/html",
		Minifier: nil,
	},
	"tmpl": {
		Type:     "text/plain",
		Minifier: nil,
	},
	"frag": {
		Type:     "text/plain",
		Minifier: nil,
	},
	"svg": {
		Type:     "image/svg+xml",
		Minifier: nil,
	},
	"js": {
		Type:     "application/javascript",
		Minifier: nil,
	},
	"wasm": {
		Type:     "application/wasm",
		Minifier: nil,
	},
	"*": {
		Type:     "text/plain",
		Minifier: nil,
	},
}
