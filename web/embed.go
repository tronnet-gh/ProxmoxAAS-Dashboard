package embed

import (
	"embed"
)

//go:embed css/*
var CSS_fs embed.FS

//go:embed images/*
var Images_fs embed.FS

//go:embed modules/*
var Modules_fs embed.FS

//go:embed scripts/*
var Scripts_fs embed.FS

//go:embed html/*
var HTML embed.FS

//go:embed templates/*
var Templates embed.FS

/*
//go:embed html/account.html
var Account string

//go:embed html/index.html
var Index string

//go:embed html/instance.html
var Instance string

//go:embed html/login.html
var Login string

//go:embed html/settings.html
var Settings string

//go:embed templates/base.html
var Base string
*/
