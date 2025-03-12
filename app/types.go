package app

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

type RequestType int

type RequestContext struct {
	Cookies map[string]string
	Body    map[string]interface{}
}

// used in constructing instance cards in index
type Node struct {
	Node   string `json:"node"`
	Status string `json:"status"`
}

// used in constructing instance cards in index
type Instance struct {
	VMID             uint
	Name             string
	Type             string
	Status           string
	Node             string
	StatusIcon       Icon
	NodeStatus       string
	NodeStatusIcon   Icon
	PowerBtnIcon     Icon
	ConsoleBtnIcon   Icon
	ConfigureBtnIcon Icon
	DeleteBtnIcon    Icon
}
