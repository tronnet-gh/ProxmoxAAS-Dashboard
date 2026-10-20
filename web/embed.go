package web

import (
	"embed"
)

//go:embed css/*
//go:embed images/*
//go:embed modules/*
//go:embed scripts/*
var Static embed.FS

//go:embed html/*
//go:embed templates/*
var Templates embed.FS
