package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

func HandleGETIndex(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := GetClusterResources(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}
		c.HTML(http.StatusOK, "html/index.html", gin.H{
			"global":    common.Global,
			"page":      "index",
			"instances": instances,
		})
	} else { // return index without populating
		c.Redirect(http.StatusFound, "/login") // if user is not authed, redirect user to login page
	}
}

func HandleGETInstancesFragment(c *gin.Context) {
	Auth, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := GetClusterResources(Auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}
		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/index-instances.frag", gin.H{
			"instances": instances,
		})
		c.Status(http.StatusOK)
	} else { // return 401
		c.Status(http.StatusUnauthorized)
	}

}

// used in constructing instance cards in index
type Node struct {
	Node   string `json:"node"`
	Status string `json:"status"`
}

// used in constructing instance cards in index
type InstanceCard struct {
	VMID       uint
	Name       string
	Type       string
	Status     string
	Node       string
	NodeStatus string
}

func GetClusterResources(auth common.Auth) (map[uint]InstanceCard, map[string]Node, error) {
	ctx := common.RequestContext{
		Cookies: map[string]string{
			"PVEAuthCookie":       auth.Token,
			"CSRFPreventionToken": auth.CSRF,
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

	instances := map[uint]InstanceCard{}
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
			instance := InstanceCard{}
			err := mapstructure.Decode(v, &instance)
			if err != nil {
				return nil, nil, err
			}
			instances[instance.VMID] = instance
		}
	}
	for vmid, instance := range instances {
		nodestatus := nodes[instance.Node].Status
		instance.NodeStatus = nodestatus
		instances[vmid] = instance
	}
	return instances, nodes, nil
}
