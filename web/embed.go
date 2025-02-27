package web

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
