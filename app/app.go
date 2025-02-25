package app

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	embed "proxmoxaas-dashboard/dist/web" // go will complain here until the first build
	"text/template"
)

var html map[string]*template.Template

func ParseTemplates() {
	html = make(map[string]*template.Template)
	fs.WalkDir(embed.HTML, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() { // if it is a html file, parse with all the template files
			v, err := fs.ReadFile(embed.HTML, path)
			if err != nil {
				log.Fatalf("error reading html file %s: %s", path, err.Error())
			}
			t := template.New(d.Name())
			t, err = t.Parse(string(v))
			if err != nil {
				log.Fatalf("error parsing html file %s: %s", path, err.Error())
			}
			fs.WalkDir(embed.Templates, ".", func(path string, e fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if !e.IsDir() { // if it is a template file, parse it
					v, err = fs.ReadFile(embed.Templates, path)
					if err != nil {
						log.Fatalf("error reading template file %s: %s", path, err.Error())
					}
					t, err = t.Parse(string(v))
					if err != nil {
						log.Fatalf("error parsing template file %s: %s", path, err.Error())
					}
				}
				return nil
			})
			html[d.Name()] = t
		}
		return nil
	})

}

func ServeStatic() {
	http.Handle("/css/", http.FileServerFS(embed.CSS_fs))
	http.Handle("/images/", http.FileServerFS(embed.Images_fs))
	http.Handle("/modules/", http.FileServerFS(embed.Modules_fs))
	http.Handle("/scripts/", http.FileServerFS(embed.Scripts_fs))
}

func Run() {
	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()

	global := GetConfig(*configPath)

	ParseTemplates()

	http.HandleFunc("/account.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "account"
		err := html["account.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "index"
		err := html["index.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	http.HandleFunc("/index.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "index"
		err := html["index.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	http.HandleFunc("/instance.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "instance"
		err := html["instance.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	http.HandleFunc("/login.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "login"
		err := html["login.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	http.HandleFunc("/settings.html", func(w http.ResponseWriter, r *http.Request) {
		global.Page = "settings"
		err := html["settings.html"].Execute(w, global)
		if err != nil {
			log.Fatal(err.Error())
		}
	})

	ServeStatic()

	log.Printf("Starting HTTP server at port: %d\n", global.Port)
	err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", global.Port), nil)
	if err != nil {
		log.Fatal(err)
	}
}
