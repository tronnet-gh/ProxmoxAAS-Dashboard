package app

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

var PlainTextMimeType = MimeType{
	Type:     "text/plain",
	Minifier: nil,
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
}

// used when requesting GET /access/domains
type GetRealmsBody struct {
	Data []Realm `json:"data"`
}

// stores each realm's data
type Realm struct {
	Default int    `json:"default"`
	Realm   string `json:"realm"`
	Comment string `json:"comment"`
}

// type used for templated <select>
type Select struct {
	ID      string
	Name    string
	Options []Option
}

// type used for templated <option>
type Option struct {
	Selected bool
	Value    string
	Display  string
}
