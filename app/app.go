package app

import (
	"flag"
	"fmt"
	"log"
	"proxmoxaas-dashboard/app/common"
	"proxmoxaas-dashboard/app/routes"
	"strings"
	"web" // go will complain here until the first build

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify/v2"
)

func Run() {
	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()

	common.Global = common.GetConfig(*configPath)

	// setup gin
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// setup static resources
	m := common.InitMinify()
	ServeStatic(router, m)
	html := common.MinifyStatic(m, web.Templates)
	common.TMPL = common.LoadHTMLToGin(router, html)

	// dynamic routes for pages and page fragments
	router.GET("/", routes.HandleGETIndex)
	router.GET("/index", routes.HandleGETIndex)
	router.GET("/index/instances", routes.HandleGETInstancesFragment)
	router.GET("/account", routes.HandleGETAccount)
	router.GET("/config", routes.HandleGETConfig)
	router.GET("/config/volumes", routes.HandleGETConfigVolumesFragment)
	router.GET("/config/nets", routes.HandleGETConfigNetsFragment)
	router.GET("/config/devices", routes.HandleGETConfigDevicesFragment)
	router.GET("/config/boot", routes.HandleGETConfigBootFragment)
	router.GET("/backups", routes.HandleGETBackups)
	router.GET("/backups/backups", routes.HandleGETBackupsFragment)
	router.GET("/login", routes.HandleGETLogin)
	router.GET("/settings", routes.HandleGETSettings)

	// run on all interfaces with port
	log.Fatal("[ERR ] starting gin router: ", router.Run(fmt.Sprintf("0.0.0.0:%d", common.Global.Port)))
}

// setup static resources under web (css, images, modules, scripts)
func ServeStatic(router *gin.Engine, m *minify.M) {
	static := common.MinifyStatic(m, web.Static)
	router.GET("/websrc/*path", func(c *gin.Context) {
		path, _ := c.Params.Get("path")
		trimed_path := strings.Replace(path, "/", "", 1) // replace leading "/" captured by *path
		data := static[trimed_path]
		fmt.Println(path)
		c.Header("Content-Encoding", data.MimeType.Encoding)
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
}
