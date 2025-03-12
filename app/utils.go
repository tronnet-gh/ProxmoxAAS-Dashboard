package app

import (
	"bufio"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
	"github.com/tdewolff/minify"
)

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

func InitMinify() *minify.M {
	m := minify.New()
	for _, v := range MimeTypes {
		if v.Minifier != nil {
			m.AddFunc(v.Type, v.Minifier)
		}
	}
	return m
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
				mimetype := MimeTypes["*"]
				minified[path] = StaticFile{
					Data:     string(v),
					MimeType: mimetype,
				}
			}
		}
		return nil
	})
	return minified
}

func LoadHTMLToGin(engine *gin.Engine, html map[string]StaticFile) *template.Template {
	root := template.New("")
	tmpl := template.Must(root, LoadAndAddToRoot(engine.FuncMap, root, html))
	engine.SetHTMLTemplate(tmpl)
	return tmpl
}

func LoadAndAddToRoot(FuncMap template.FuncMap, root *template.Template, html map[string]StaticFile) error {
	for name, file := range html {
		t := root.New(name).Funcs(FuncMap)
		_, err := t.Parse(file.Data)
		if err != nil {
			return err
		}
	}
	return nil
}

func TemplateMinifier(m *minify.M, w io.Writer, r io.Reader, _ map[string]string) error {
	// remove newlines and tabs
	rb := bufio.NewReader(r)
	for {
		line, err := rb.ReadString('\n')
		if err != nil && err != io.EOF {
			return err
		}
		line = strings.Replace(line, "\n", "", -1)
		line = strings.Replace(line, "\t", "", -1)
		line = strings.Replace(line, "    ", "", -1)
		if _, errws := io.WriteString(w, line); errws != nil {
			return errws
		}
		if err == io.EOF {
			break
		}
	}
	return nil
}

func HandleNonFatalError(c *gin.Context, err error) {
	log.Printf("[Error] encountered an error: %s", err.Error())
	c.Status(http.StatusInternalServerError)
}

func RequestGetAPI(path string, context RequestContext) (*http.Response, error) {
	req, err := http.NewRequest("GET", global.API+path, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range context.Cookies {
		req.AddCookie(&http.Cookie{Name: k, Value: v})
	}

	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		return nil, err
	} else if response.StatusCode != 200 {
		return response, nil
	}

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	err = response.Body.Close()
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(data, &context.Body)
	if err != nil {
		return nil, err
	}

	return response, nil

}

func get_API_resources(token string, csrf string) (map[uint]Instance, map[string]Node, error) {
	ctx := RequestContext{
		Cookies: map[string]string{
			"PVEAuthCookie":       token,
			"CSRFPreventionToken": csrf,
		},
		Body: map[string]any{},
	}
	res, err := RequestGetAPI("/proxmox/cluster/resources", ctx)
	if err != nil {
		return nil, nil, err
	}

	instances := map[uint]Instance{}
	nodes := map[string]Node{}

	if res.StatusCode == 200 { // if we successfully retrieved the resources, then process it and return index
		for _, v := range ctx.Body["data"].([]any) {
			m := v.(map[string]any)
			if m["type"] == "node" {
				node := Node{}
				err := mapstructure.Decode(v, &node)
				if err != nil {
					return nil, nil, err
				}
				nodes[node.Node] = node
			} else if m["type"] == "lxc" || m["type"] == "qemu" {
				instance := Instance{}
				err := mapstructure.Decode(v, &instance)
				if err != nil {
					return nil, nil, err
				}
				instances[instance.VMID] = instance
			}
		}
		for vmid, instance := range instances {
			status := instance.Status
			icons := Icons[status]
			instance.StatusIcon = icons["status"]
			instance.PowerBtnIcon = icons["power"]
			instance.PowerBtnIcon.ID = "power-btn"
			instance.ConfigureBtnIcon = icons["config"]
			instance.ConfigureBtnIcon.ID = "configure-btn"
			instance.ConsoleBtnIcon = icons["console"]
			instance.ConsoleBtnIcon.ID = "console-btn"
			instance.DeleteBtnIcon = icons["delete"]
			instance.DeleteBtnIcon.ID = "delete-btn"
			nodestatus := nodes[instance.Node].Status
			icons = Icons[nodestatus]
			instance.NodeStatus = nodestatus
			instance.NodeStatusIcon = icons["status"]
			instances[vmid] = instance
		}
		return instances, nodes, nil
	} else { // if we did not successfully retrieve resources, then return 500 because auth was 1 but was invalid somehow
		return nil, nil, fmt.Errorf("request to /cluster/resources/ resulted in %+v", res)
	}
}
