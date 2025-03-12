package app

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"proxmoxaas-dashboard/dist/web" // go will complain here until the first build

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
	"github.com/tdewolff/minify"
)

var tmpl *template.Template
var global Config

func Run() {
	gin.SetMode(gin.ReleaseMode)

	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()
	global = GetConfig(*configPath)

	router := gin.Default()
	m := InitMinify()
	ServeStatic(router, m)
	html := MinifyStatic(m, web.Templates)
	tmpl = LoadHTMLToGin(router, html)

	router.GET("/account.html", handle_GET_Account)
	router.GET("/", handle_GET_Index)
	router.GET("/index.html", handle_GET_Index)
	router.GET("/instance.html", handle_GET_Instance)
	router.GET("/login.html", handle_GET_Login)
	router.GET("/settings.html", handle_GET_Settings)

	router.GET("/instances_fragment", handle_GET_Instances_Fragment)

	log.Fatal(router.Run(fmt.Sprintf("0.0.0.0:%d", global.Port)))
}

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

func handle_GET_Account(c *gin.Context) {
	c.HTML(http.StatusOK, "html/account.html", gin.H{
		"global": global,
		"page":   "account",
	})
}

func handle_GET_Index(c *gin.Context) {
	_, err := c.Cookie("auth")
	token, _ := c.Cookie("PVEAuthCookie")
	csrf, _ := c.Cookie("CSRFPreventionToken")
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := get_API_resources(token, csrf)
		if err != nil {
			HandleNonFatalError(c, err)
		}
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global":    global,
			"page":      "index",
			"instances": instances,
		})
	} else { // return index without populating
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global": global,
			"page":   "index",
		})
	}
}

func handle_GET_Instances_Fragment(c *gin.Context) {
	_, err := c.Cookie("auth")
	token, _ := c.Cookie("PVEAuthCookie")
	csrf, _ := c.Cookie("CSRFPreventionToken")
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := get_API_resources(token, csrf)
		if err != nil {
			HandleNonFatalError(c, err)
		}
		c.Header("Content-Type", "text/plain")
		tmpl.ExecuteTemplate(c.Writer, "templates/instances.frag", gin.H{
			"instances": instances,
		})
		c.Status(http.StatusOK)
	} else { // return index without populating
		c.Status(http.StatusUnauthorized)
	}

}

func handle_GET_Instance(c *gin.Context) {
	c.HTML(http.StatusOK, "html/instance.html", gin.H{
		"global": global,
		"page":   "instance",
	})
}

func handle_GET_Login(c *gin.Context) {
	ctx := RequestContext{
		Cookies: nil,
		Body:    map[string]interface{}{},
	}
	res, err := RequestGetAPI("/proxmox/access/domains", ctx)
	if err != nil {
		HandleNonFatalError(c, err)
		return
	}
	if res.StatusCode != 200 { // we expect /access/domains to always be avaliable
		HandleNonFatalError(c, err)
		return
	}

	realms := Select{
		ID:   "realm",
		Name: "realm",
	}

	for _, v := range ctx.Body["data"].([]interface{}) {
		v = v.(map[string]interface{})
		realm := Realm{}
		err := mapstructure.Decode(v, &realm)
		if err != nil {
			HandleNonFatalError(c, err)
		}
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
}

func handle_GET_Settings(c *gin.Context) {
	c.HTML(http.StatusOK, "html/settings.html", gin.H{
		"global": global,
		"page":   "settings",
	})
}
