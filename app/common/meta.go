package common

import (
	"io"

	"github.com/tdewolff/minify"
	"github.com/tdewolff/minify/css"
	"github.com/tdewolff/minify/html"
	"github.com/tdewolff/minify/js"
)

type MimeType struct {
	Type     string
	Minifier func(m *minify.M, w io.Writer, r io.Reader, params map[string]string) error
}

var MimeTypes = map[string]MimeType{
	"css": {
		Type:     "text/css",
		Minifier: css.Minify,
	},
	"html": {
		Type:     "text/html",
		Minifier: html.Minify,
	},
	"tmpl": {
		Type:     "text/plain",
		Minifier: TemplateMinifier,
	},
	"frag": {
		Type:     "text/plain",
		Minifier: TemplateMinifier,
	},
	"svg": {
		Type:     "image/svg+xml",
		Minifier: nil,
	},
	"js": {
		Type:     "application/javascript",
		Minifier: js.Minify,
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
