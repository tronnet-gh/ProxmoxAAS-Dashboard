package common

import (
	"bufio"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"log"
	"math"
	"net/http"
	"os"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tdewolff/minify/v2"
)

// get config file from configPath
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

// initialize minifier using the meta types specified
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
		"Map": func(values ...any) (map[string]any, error) {
			if len(values)%2 != 0 {
				return nil, errors.New("invalid dict call")
			}
			dict := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, errors.New("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
	}
	tmpl := template.Must(root, LoadAndAddToRoot(engine.FuncMap, root, html))
	engine.SetHTMLTemplate(root)
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

func RequestGetAPI(path string, context RequestContext, body any) (*http.Response, int, error) {
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

	switch body.(type) { // write json to body object depending on type, currently supports map[string]any (ie json) or []any (ie array of json)
	case *map[string]any:
		err = json.Unmarshal(data, &body)
		if err != nil {
			return nil, response.StatusCode, err
		}
	case *[]any:
		err = json.Unmarshal(data, &body)
		if err != nil {
			return nil, response.StatusCode, err
		}
	default:
	}

	return response, response.StatusCode, nil
}

func GetAuth(c *gin.Context) (Auth, error) {
	_, errAuth := c.Cookie("auth")
	username, errUsername := c.Cookie("username")
	token, errToken := c.Cookie("PVEAuthCookie")
	csrf, errCSRF := c.Cookie("CSRFPreventionToken")
	if errUsername != nil || errAuth != nil || errToken != nil || errCSRF != nil {
		return Auth{}, fmt.Errorf("error occured getting user cookies: (auth: %s, token: %s, csrf: %s)", errAuth, errToken, errCSRF)
	} else {
		return Auth{username, token, csrf}, nil
	}
}

func ExtractVMPath(c *gin.Context) (VMPath, error) {
	req_node := c.Query("node")
	req_type := c.Query("type")
	req_vmid := c.Query("vmid")
	if req_node == "" || req_type == "" || req_vmid == "" {
		return VMPath{}, fmt.Errorf("request missing required values: (node: %s, type: %s, vmid: %s)", req_node, req_type, req_vmid)
	}
	vm_path := VMPath{
		Node: req_node,
		Type: req_type,
		VMID: req_vmid,
	}
	return vm_path, nil
}

func FormatNumber(val int64, base int64) (float64, string) {
	valf := float64(val)
	basef := float64(base)
	steps := 0
	for math.Abs(valf) > basef && steps < 4 {
		valf /= basef
		steps++
	}

	if base == 1000 {
		prefixes := []string{"", "K", "M", "G", "T"}
		return valf, prefixes[steps]
	} else if base == 1024 {
		prefixes := []string{"", "Ki", "Mi", "Gi", "Ti"}
		return valf, prefixes[steps]
	} else {
		return 0, ""
	}
}
