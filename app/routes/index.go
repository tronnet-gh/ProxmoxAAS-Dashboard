package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

// used in constructing instance cards in index
type Node struct {
	Node   string `json:"node"`
	Status string `json:"status"`
}

// used in constructing instance cards in index
type Instance struct {
	VMID             uint
	Name             string
	Type             string
	Status           string
	Node             string
	StatusIcon       common.Icon
	NodeStatus       string
	NodeStatusIcon   common.Icon
	PowerBtnIcon     common.Icon
	ConsoleBtnIcon   common.Icon
	ConfigureBtnIcon common.Icon
	DeleteBtnIcon    common.Icon
}

func GetClusterResources(token string, csrf string) (map[uint]Instance, map[string]Node, error) {
	ctx := common.RequestContext{
		Cookies: map[string]string{
			"PVEAuthCookie":       token,
			"CSRFPreventionToken": csrf,
		},
		Body: map[string]any{},
	}
	res, code, err := common.RequestGetAPI("/proxmox/cluster/resources", ctx)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 { // if we did not successfully retrieve resources, then return 500 because auth was 1 but was invalid somehow
		return nil, nil, fmt.Errorf("request to /cluster/resources/ resulted in %+v", res)
	}

	instances := map[uint]Instance{}
	nodes := map[string]Node{}

	// if we successfully retrieved the resources, then process it and return index
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
		icons := common.Icons[status]
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
		icons = common.Icons[nodestatus]
		instance.NodeStatus = nodestatus
		instance.NodeStatusIcon = icons["status"]
		instances[vmid] = instance
	}
	return instances, nodes, nil
}

func HandleGETIndex(c *gin.Context) {
	_, token, csrf, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := GetClusterResources(token, csrf)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global":    common.Global,
			"page":      "index",
			"instances": instances,
		})
	} else { // return index without populating
		c.Redirect(http.StatusFound, "/login.html") // if user is not authed, redirect user to login page
	}
}

func HandleGETInstancesFragment(c *gin.Context) {
	_, token, csrf, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := GetClusterResources(token, csrf)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}
		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/instances.frag", gin.H{
			"instances": instances,
		})
		c.Status(http.StatusOK)
	} else { // return index without populating
		c.Status(http.StatusUnauthorized)
	}

}
