package common

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
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify"
)

var TMPL *template.Template
var Global Config

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
	engine.FuncMap = template.FuncMap{
		"MapKeys": func(x any, sep string) string {
			v := reflect.ValueOf(x)
			keys := v.MapKeys()
			s := ""
			for i := 0; i < len(keys); i++ {
				if i != 0 {
					s += sep
				}
				s += keys[i].String()
			}
			return s
		},
	}
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

func RequestGetAPI(path string, context RequestContext) (*http.Response, int, error) {
	req, err := http.NewRequest("GET", Global.API+path, nil)
	if err != nil {
		return nil, 0, err
	}
	for k, v := range context.Cookies {
		req.AddCookie(&http.Cookie{Name: k, Value: v})
	}

	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		return nil, response.StatusCode, err
	} else if response.StatusCode != 200 {
		return response, response.StatusCode, nil
	}

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, response.StatusCode, err
	}

	err = response.Body.Close()
	if err != nil {
		return nil, response.StatusCode, err
	}

	err = json.Unmarshal(data, &context.Body)
	if err != nil {
		return nil, response.StatusCode, err
	}

	return response, response.StatusCode, nil
}

func GetAuth(c *gin.Context) (string, string, string, error) {
	_, errAuth := c.Cookie("auth")
	username, errUsername := c.Cookie("username")
	token, errToken := c.Cookie("PVEAuthCookie")
	csrf, errCSRF := c.Cookie("CSRFPreventionToken")
	if errUsername != nil || errAuth != nil || errToken != nil || errCSRF != nil {
		return "", "", "", fmt.Errorf("error occured getting user cookies: (auth: %s, token: %s, csrf: %s)", errAuth, errToken, errCSRF)
	} else {
		return username, token, csrf, nil
	}
}
