package app

import (
	"bytes"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"proxmoxaas-dashboard/dist/web" // go will complain here until the first build
	"strings"
	"text/template"

	"github.com/tdewolff/minify"
)

func ParseTemplates() map[string]*template.Template {
	// create html map which stores html files to parsed templates
	html := make(map[string]*template.Template)
	fs.WalkDir(web.HTML, ".", func(path string, html_entry fs.DirEntry, err error) error { // walk the html directory
		if err != nil {
			return err
		}
		if !html_entry.IsDir() { // if it is an html file, parse with all the template files
			v, err := fs.ReadFile(web.HTML, path)
			if err != nil {
				log.Fatalf("error reading html file %s: %s", path, err.Error())
			}
			t := template.New(html_entry.Name()) // parse the html file
			t, err = t.Parse(string(v))
			if err != nil {
				log.Fatalf("error parsing html file %s: %s", path, err.Error())
			}
			// parse the html with every template file
			fs.WalkDir(web.Templates, ".", func(path string, templates_entry fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if !templates_entry.IsDir() { // if it is a template file, parse it
					v, err = fs.ReadFile(web.Templates, path)
					if err != nil {
						log.Fatalf("error reading template file %s: %s", path, err.Error())
					}
					t, err = t.Parse(string(v)) // parse the template file
					if err != nil {
						log.Fatalf("error parsing template file %s: %s", path, err.Error())
					}
				}
				return nil
			})
			html[html_entry.Name()] = t
		}
		return nil
	})
	return html
}

func ServeStatic(m *minify.M) {
	css := MinifyStatic(m, web.CSS_fs)
	http.HandleFunc("/css/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		data := css[path]
		w.Header().Add("Content-Type", data.MimeType.Type)
		w.Write([]byte(data.Data))
	})
	images := MinifyStatic(m, web.Images_fs)
	http.HandleFunc("/images/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		data := images[path]
		w.Header().Add("Content-Type", data.MimeType.Type)
		w.Write([]byte(data.Data))
	})
	modules := MinifyStatic(m, web.Modules_fs)
	http.HandleFunc("/modules/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		data := modules[path]
		w.Header().Add("Content-Type", data.MimeType.Type)
		w.Write([]byte(data.Data))
	})
	scripts := MinifyStatic(m, web.Scripts_fs)
	http.HandleFunc("/scripts/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		data := scripts[path]
		w.Header().Add("Content-Type", data.MimeType.Type)
		w.Write([]byte(data.Data))
	})
}

func Run() {
	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()

	global := GetConfig(*configPath)

	m := InitMinify()

	ServeStatic(m)

	html := ParseTemplates()

	http.HandleFunc("/account.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "account"
		page := bytes.Buffer{}
		err := html["account.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "index"
		page := bytes.Buffer{}
		err := html["index.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	http.HandleFunc("/index.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "index"
		page := bytes.Buffer{}
		err := html["index.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	http.HandleFunc("/instance.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "instance"
		page := bytes.Buffer{}
		err := html["instance.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	http.HandleFunc("/login.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "login"
		page := bytes.Buffer{}
		err := html["login.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	http.HandleFunc("/settings.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "settings"
		page := bytes.Buffer{}
		err := html["settings.html"].Execute(&page, global)
		if err != nil {
			log.Fatal(err.Error())
		}
		minified := bytes.Buffer{}
		err = m.Minify("text/html", &minified, &page)
		if err != nil {
			log.Fatal(err.Error())
		}
		w.Write(minified.Bytes())
	})

	log.Printf("Starting HTTP server at port: %d\n", global.Port)
	err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", global.Port), nil)
	if err != nil {
		log.Fatal(err)
	}
}
