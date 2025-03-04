package app

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"proxmoxaas-dashboard/dist/web" // go will complain here until the first build

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify"
)

func ServeStatic(router *gin.Engine, m *minify.M) {
	css := MinifyStatic(m, web.CSS_fs)
	router.GET("/css/*css", func(c *gin.Context) {
		path, _ := c.Params.Get("css")
		data := css[fmt.Sprintf("css%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	images := MinifyStatic(m, web.Images_fs)
	router.GET("/images/*image", func(c *gin.Context) {
		path, _ := c.Params.Get("image")
		data := images[fmt.Sprintf("images%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	modules := MinifyStatic(m, web.Modules_fs)
	router.GET("/modules/*module", func(c *gin.Context) {
		path, _ := c.Params.Get("module")
		data := modules[fmt.Sprintf("modules%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
	scripts := MinifyStatic(m, web.Scripts_fs)
	router.GET("/scripts/*script", func(c *gin.Context) {
		path, _ := c.Params.Get("script")
		data := scripts[fmt.Sprintf("scripts%s", path)]
		c.Data(200, data.MimeType.Type, []byte(data.Data))
	})
}

func Run() {
	gin.SetMode(gin.ReleaseMode)

	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()

	global := GetConfig(*configPath)

	router := gin.Default()
	m := InitMinify()

	ServeStatic(router, m)

	html := MinifyStatic(m, web.Templates)
	LoadHTMLToGin(router, html)

	router.GET("/account.html", func(c *gin.Context) {
		c.HTML(http.StatusOK, "html/account.html", gin.H{
			"global": global,
			"page":   "account",
		})
	})

	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global": global,
			"page":   "index",
		})
	})

	router.GET("/index.html", func(c *gin.Context) {
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global": global,
			"page":   "index",
		})
	})

	router.GET("/instance.html", func(c *gin.Context) {
		c.HTML(http.StatusOK, "html/instance.html", gin.H{
			"global": global,
			"page":   "instance",
		})
	})

	router.GET("/login.html", func(c *gin.Context) {
		response, err := http.Get(global.API + "/proxmox/access/domains")
		if err != nil {
			log.Fatal(err.Error())
		}
		data, err := io.ReadAll(response.Body)
		response.Body.Close()
		body := GetRealmsBody{}
		json.Unmarshal(data, &body)
		realms := Select{
			ID:   "realm",
			Name: "realm",
		}
		for _, realm := range body.Data {
			realms.Options = append(realms.Options, Option{
				Selected: realm.Default != 0,
				Value:    realm.Realm,
				Display:  realm.Comment,
			})
		}

		c.HTML(http.StatusOK, "html/login.html", gin.H{
			"global": global,
			"page":   "login",
			"realms": realms,
		})
	})

	router.GET("/settings.html", func(c *gin.Context) {
		c.HTML(http.StatusOK, "html/settings.html", gin.H{
			"global": global,
			"page":   "settings",
		})
	})

	router.Run(fmt.Sprintf("0.0.0.0:%d", global.Port))
}
