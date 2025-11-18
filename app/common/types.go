package common

import "html/template"

var Global Config

type Config struct {
	Port         int    `json:"listenPort"`
	Organization string `json:"organization"`
	DASH         string `json:"dashurl"`
	PVE          string `json:"pveurl"`
	API          string `json:"apiurl"`
}

// variable for html template root
// generated from LoadHTMLToGin
var TMPL *template.Template

// static served file type containing data and mimetype
type StaticFile struct {
	Data     string
	MimeType MimeType
}

// parsed vmpath data (ie node/type/vmid)
type VMPath struct {
	Node string
	Type string
	VMID string
}

// type used for templated <select>
type Select struct {
	ID       string
	Required bool
	Options  []Option
}

// type used for templated <option>
type Option struct {
	Selected bool
	Value    string
	Display  string
}

type RequestContext struct {
	Cookies map[string]string
}

type Auth struct {
	Username string
	Token    string
	CSRF     string
}

type Icon struct {
	ID        string
	Src       string
	Alt       string
	Clickable bool
}
