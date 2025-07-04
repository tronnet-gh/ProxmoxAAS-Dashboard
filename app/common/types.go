package common

type Config struct {
	Port         int    `json:"listenPort"`
	Organization string `json:"organization"`
	DASH         string `json:"dashurl"`
	PVE          string `json:"pveurl"`
	API          string `json:"apiurl"`
}

type StaticFile struct {
	Data     string
	MimeType MimeType
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

type RequestType int

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
