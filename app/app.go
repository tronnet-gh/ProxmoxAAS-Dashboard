package app

import (
	"fmt"
	"log"
	"proxmoxaas-dashboard/app/common"
	"proxmoxaas-dashboard/app/routes"
	"proxmoxaas-dashboard/dist/web" // go will complain here until the first build

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify/v2"
)

func Run(configPath *string) {
	common.Global = common.GetConfig(*configPath)

	// setup static resources
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()
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
	log.Fatal(router.Run(fmt.Sprintf("0.0.0.0:%d", common.Global.Port)))
}

// setup static resources under web (css, images, modules, scripts)
func ServeStatic(router *gin.Engine, m *minify.M) {
	css := common.MinifyStatic(m, web.CSS_fs)
	router.GET("/css/*css", func(c *gin.Context) {
		path, _ := c.Params.Get("css")
		data := css[fmt.Sprintf("css%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	images := common.MinifyStatic(m, web.Images_fs)
	router.GET("/images/*image", func(c *gin.Context) {
		path, _ := c.Params.Get("image")
		data := images[fmt.Sprintf("images%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	modules := common.MinifyStatic(m, web.Modules_fs)
	router.GET("/modules/*module", func(c *gin.Context) {
		path, _ := c.Params.Get("module")
		data := modules[fmt.Sprintf("modules%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	scripts := common.MinifyStatic(m, web.Scripts_fs)
	router.GET("/scripts/*script", func(c *gin.Context) {
		path, _ := c.Params.Get("script")
		data := scripts[fmt.Sprintf("scripts%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
}
