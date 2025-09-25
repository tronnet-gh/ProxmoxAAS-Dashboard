package common

import (
	"io"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/html"
	"github.com/tdewolff/minify/v2/js"
	"github.com/tdewolff/minify/v2/svg"
)

// defines mime type and associated minifier
type MimeType struct {
	Type     string
	Minifier func(m *minify.M, w io.Writer, r io.Reader, params map[string]string) error
}

// map file extension to mime types
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
		Minifier: svg.Minify,
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

// debug mime types
/*
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
*/
