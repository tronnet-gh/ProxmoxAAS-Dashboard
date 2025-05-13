package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	"strconv"

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

// used in retriving cluster tasks
type Task struct {
	Type   string
	Node   string
	User   string
	ID     string
	VMID   uint
	Status string
}

type InstanceStatus struct {
	Status string
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
		return nil, nil, fmt.Errorf("request to /cluster/resources resulted in %+v", res)
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

	ctx.Body = map[string]any{}
	res, code, err = common.RequestGetAPI("/proxmox/cluster/tasks", ctx)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 { // if we did not successfully retrieve tasks, then return 500 because auth was 1 but was invalid somehow
		return nil, nil, fmt.Errorf("request to /cluster/tasks resulted in %+v", res)
	}

	for _, v := range ctx.Body["data"].([]any) {
		task := Task{}
		err := mapstructure.Decode(v, &task)
		if err != nil {
			return nil, nil, err
		}
		x, err := strconv.Atoi(task.ID)
		task.VMID = uint(x)
		if err != nil {
			return nil, nil, err
		}

		if task.User != auth.Username { // task was not made by user (ie was not a power on/off task)
			continue
		} else if _, ok := instances[task.VMID]; !ok { // task does not refer to an instance in user's instances
			continue
		} else if instances[task.VMID].Node != task.Node { // task does not have the correct node reference (should not happen)
			continue
		} else if !(task.Type == "qmstart" || task.Type == "qmstop" || task.Type == "vzstart" || task.Type == "vzstop") { // task is not start/stop for qemu or lxc
			continue
		} else if !(task.Status == "running" || task.Status == "OK") { // task is not running or finished with status OK
			continue
		} else { // recent task is a start or stop task for user instance which is running or "OK"
			// get /status/current which is updated faster than /cluster/resources
			instance := instances[task.VMID]
			path := fmt.Sprintf("/proxmox/nodes/%s/%s/%d/status/current", instance.Node, instance.Type, instance.VMID)
			ctx.Body = map[string]any{}
			res, code, err := common.RequestGetAPI(path, ctx)
			if err != nil {
				return nil, nil, err
			}
			if code != 200 { // if we did not successfully retrieve tasks, then return 500 because auth was 1 but was invalid somehow
				return nil, nil, fmt.Errorf("request to %s resulted in %+v", path, res)
			}

			status := InstanceStatus{}
			mapstructure.Decode(ctx.Body["data"], &status)

			instance.Status = status.Status
			instances[task.VMID] = instance
		}
	}

	return instances, nodes, nil
}
