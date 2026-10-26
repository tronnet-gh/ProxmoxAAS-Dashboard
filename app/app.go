package app

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	"proxmoxaas-dashboard/app/routes"
	"proxmoxaas-dashboard/app/web"
	"time"

	//"web" // go will complain here until the first build

	"github.com/tdewolff/minify/v2"
)

func Run() {
	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()
	common.Global = common.GetConfig(*configPath)
	log.Printf("[INFO] Read in config from %s\n", *configPath)

	// setup http router
	router := http.NewServeMux()

	// setup static resources
	m := common.InitMinify()
	ServeStatic(router, m)
	html := common.MinifyStatic(m, web.Templates)
	common.TMPL = common.LoadHTML(html)

	// dynamic routes for pages and page fragments
	router.HandleFunc("GET /", routes.HandleGETIndex)
	router.HandleFunc("GET /index", routes.HandleGETIndex)
	router.HandleFunc("GET /index/instances", routes.HandleGETInstancesFragment)
	router.HandleFunc("GET /account", routes.HandleGETAccount)
	router.HandleFunc("GET /config", routes.HandleGETConfig)
	router.HandleFunc("GET /config/volumes", routes.HandleGETConfigVolumesFragment)
	router.HandleFunc("GET /config/nets", routes.HandleGETConfigNetsFragment)
	router.HandleFunc("GET /config/devices", routes.HandleGETConfigDevicesFragment)
	router.HandleFunc("GET /config/boot", routes.HandleGETConfigBootFragment)
	router.HandleFunc("GET /backups", routes.HandleGETBackups)
	router.HandleFunc("GET /backups/backups", routes.HandleGETBackupsFragment)
	router.HandleFunc("GET /login", routes.HandleGETLogin)
	router.HandleFunc("GET /settings", routes.HandleGETSettings)

	server := LoggingMiddleware(router)

	log.Printf("[INFO] starting server listening on 0.0.0.0:%d", common.Global.Port)
	log.Fatalf("[ERR ] starting gin router: %s", http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", common.Global.Port), server))
}

// setup static resources under web (css, images, modules, scripts)
func ServeStatic(router *http.ServeMux, m *minify.M) {
	static := common.MinifyStatic(m, web.Static)
	router.HandleFunc("GET /websrc/{path...}", func(w http.ResponseWriter, r *http.Request) {
		path := r.PathValue("path")
		data := static[path]
		w.Header().Set("Content-Encoding", data.MimeType.Encoding)
		w.Header().Set("Content-Type", data.MimeType.Type)
		w.Write([]byte(data.Data))
	})
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}
