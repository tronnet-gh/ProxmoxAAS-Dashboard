package app

import (
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"os"
	"strings"

	"github.com/tdewolff/minify"
	"github.com/tdewolff/minify/css"
	"github.com/tdewolff/minify/html"
	"github.com/tdewolff/minify/js"
)

type Config struct {
	Port         int    `json:"listenPort"`
	Organization string `json:"organization"`
	PVE          string `json:"pveurl"`
	API          string `json:"apiurl"`
	Page         string
}

func GetConfig(configPath string) Config {
	content, err := os.ReadFile(configPath)
	if err != nil {
		log.Fatal("Error when opening config file: ", err)
	}
	var config Config
	err = json.Unmarshal(content, &config)
	if err != nil {
		log.Fatal("Error during parsing config file: ", err)
	}
	return config
}

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

func InitMinify() *minify.M {
	m := minify.New()
	for _, v := range MimeTypes {
		if v.Minifier != nil {
			m.AddFunc(v.Type, v.Minifier)
		}
	}
	return m
}

type StaticFile struct {
	Data     string
	MimeType MimeType
}

func MinifyStatic(m *minify.M, files embed.FS) map[string]StaticFile {
	minified := make(map[string]StaticFile)
	fs.WalkDir(files, ".", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() {
			v, err := files.ReadFile(path)
			if err != nil {
				log.Fatalf("error parsing template file %s: %s", path, err.Error())
			}
			x := strings.Split(entry.Name(), ".")
			if len(x) >= 2 { // file has extension
				mimetype, ok := MimeTypes[x[len(x)-1]]
				if ok && mimetype.Minifier != nil { // if the extension is mapped in MimeTypes and has a minifier
					min, err := m.String(mimetype.Type, string(v)) // try to minify
					if err != nil {
						log.Fatalf("error minifying file %s: %s", path, err.Error())
					}
					minified[path] = StaticFile{
						Data:     min,
						MimeType: mimetype,
					}
				} else { // if extension is not in MimeTypes and does not have minifier, skip minify
					minified[path] = StaticFile{
						Data:     string(v),
						MimeType: mimetype,
					}
				}
			} else { // if the file has no extension, skip minify
				minified[path] = StaticFile{
					Data:     string(v),
					MimeType: PlainTextMimeType,
				}
			}
		}
		return nil
	})
	return minified
}
