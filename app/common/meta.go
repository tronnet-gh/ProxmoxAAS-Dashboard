package common

import (
	"io"

	"github.com/tdewolff/minify"
	"github.com/tdewolff/minify/css"
	"github.com/tdewolff/minify/html"
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

type Icon struct {
	ID        string
	Src       string
	Alt       string
	Clickable bool
}

var Icons = map[string]map[string]Icon{
	"running": {
		"status": {
			Src:       "images/status/active.svg",
			Alt:       "Instance is running",
			Clickable: false,
		},
		"power": {
			Src:       "images/actions/instance/stop.svg",
			Alt:       "Shutdown Instance",
			Clickable: true,
		},
		"config": {
			Src:       "images/actions/instance/config-inactive.svg",
			Alt:       "Change Configuration (Inactive)",
			Clickable: false,
		},
		"console": {
			Src:       "images/actions/instance/console-active.svg",
			Alt:       "Open Console",
			Clickable: true,
		},
		"delete": {
			Src:       "images/actions/delete-inactive.svg",
			Alt:       "Delete Instance (Inactive)",
			Clickable: false,
		},
	},
	"stopped": {
		"status": {
			Src:       "images/status/inactive.svg",
			Alt:       "Instance is stopped",
			Clickable: false,
		},
		"power": {
			Src:       "images/actions/instance/start.svg",
			Alt:       "Start Instance",
			Clickable: true,
		},
		"config": {
			Src:       "images/actions/instance/config-active.svg",
			Alt:       "Change Configuration",
			Clickable: true,
		},
		"console": {
			Src:       "images/actions/instance/console-inactive.svg",
			Alt:       "Open Console (Inactive)",
			Clickable: false,
		},
		"delete": {
			Src:       "images/actions/delete-active.svg",
			Alt:       "Delete Instance",
			Clickable: true,
		},
	},
	"loading": {
		"status": {
			Src:       "images/status/loading.svg",
			Alt:       "Instance is loading",
			Clickable: false,
		},
		"power": {
			Src:       "images/status/loading.svg",
			Alt:       "Loading Instance",
			Clickable: false,
		},
		"config": {
			Src:       "images/actions/instance/config-inactive.svg",
			Alt:       "Change Configuration (Inactive)",
			Clickable: false,
		},
		"console": {
			Src:       "images/actions/instance/console-inactive.svg",
			Alt:       "Open Console (Inactive)",
			Clickable: false,
		},
		"delete": {
			Src:       "images/actions/delete-inactive.svg",
			Alt:       "Delete Instance (Inactive)",
			Clickable: false,
		},
	},
	"online": {
		"status": {
			Src:       "images/status/active.svg",
			Alt:       "Node is online",
			Clickable: false,
		},
	},
	"offline": {
		"status": {
			Src:       "images/status/inactive.svg",
			Alt:       "Node is offline",
			Clickable: false,
		},
	},
	"uknown": {
		"status": {
			Src:       "images/status/inactive.svg",
			Alt:       "Node is offline",
			Clickable: false,
		},
	},
}
