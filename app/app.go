package app

import (
	"flag"
	"fmt"
	"log"
	"proxmoxaas-dashboard/dist/web" // go will complain here until the first build

	"proxmoxaas-dashboard/app/common"
	"proxmoxaas-dashboard/app/routes"

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify"
)

func Run() {
	gin.SetMode(gin.ReleaseMode)

	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()
	common.Global = common.GetConfig(*configPath)

	router := gin.Default()
	m := common.InitMinify()
	ServeStatic(router, m)
	html := common.MinifyStatic(m, web.Templates)
	common.TMPL = common.LoadHTMLToGin(router, html)

	router.GET("/account", routes.HandleGETAccount)
	router.GET("/", routes.HandleGETIndex)
	router.GET("/index", routes.HandleGETIndex)
	router.GET("/config", routes.HandleGETConfig)
	router.GET("/login", routes.HandleGETLogin)
	router.GET("/settings", routes.HandleGETSettings)

	router.GET("/index/instances", routes.HandleGETInstancesFragment)
	router.GET("/config/volumes", routes.HandleGETConfigVolumesFragment)

	log.Fatal(router.Run(fmt.Sprintf("0.0.0.0:%d", common.Global.Port)))
}

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
