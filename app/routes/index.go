package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

// used in constructing instance cards in index
type Node struct {
	Node   string `json:"node"`
	Status string `json:"status"`
}

// used in constructing instance cards in index
type InstanceCard struct {
	VMID        uint
	Name        string
	Type        string
	Status      string
	Node        string
	NodeStatus  string
	ConfigPath  string
	ConsolePath string
	BackupsPath string
}

// used in retriving cluster tasks
type Task struct {
	Type    string
	Node    string
	User    string
	ID      string
	VMID    uint
	Status  string
	EndTime uint
}

type InstanceStatus struct {
	Status string
}

func HandleGETIndex(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		instances, _, err := GetClusterResources(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}
		page := gin.H{
			"global":    common.Global,
			"page":      "index",
			"instances": instances,
		}
		c.HTML(http.StatusOK, "html/index.html", page)
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
		common.TMPL.ExecuteTemplate(c.Writer, "html/index-instances.go.tmpl", gin.H{
			"instances": instances,
		})
		c.Status(http.StatusOK)
	} else { // return 401
		c.Status(http.StatusUnauthorized)
	}

}

func GetClusterResources(auth common.Auth) (map[uint]InstanceCard, map[string]Node, error) {
	ctx := common.RequestContext{
		Cookies: map[string]string{
			"PVEAuthCookie":       auth.Token,
			"CSRFPreventionToken": auth.CSRF,
		},
	}
	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/proxmox/cluster/resources", ctx, &body)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 { // if we did not successfully retrieve resources, then return 500 because auth was 1 but was invalid somehow
		return nil, nil, fmt.Errorf("request to /cluster/resources resulted in %+v", res)
	}

	instances := map[uint]InstanceCard{}
	nodes := map[string]Node{}

	// if we successfully retrieved the resources, then process it and return index
	for _, v := range body["data"].([]any) {
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
		instance.ConfigPath = fmt.Sprintf("config?node=%s&type=%s&vmid=%d", instance.Node, instance.Type, instance.VMID)
		if instance.Type == "qemu" {
			instance.ConsolePath = fmt.Sprintf("%s/?console=kvm&vmid=%d&vmname=%s&node=%s&resize=off&cmd=&novnc=1", common.Global.PVE, instance.VMID, instance.Name, instance.Node)
		} else if instance.Type == "lxc" {
			instance.ConsolePath = fmt.Sprintf("%s/?console=lxc&vmid=%d&vmname=%s&node=%s&resize=off&cmd=&xtermjs=1", common.Global.PVE, instance.VMID, instance.Name, instance.Node)
		}
		instance.BackupsPath = fmt.Sprintf("backups?node=%s&type=%s&vmid=%d", instance.Node, instance.Type, instance.VMID)
		instances[vmid] = instance
	}

	body = map[string]any{}
	res, code, err = common.RequestGetAPI("/proxmox/cluster/tasks", ctx, &body)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 { // if we did not successfully retrieve tasks, then return 500 because auth was 1 but was invalid somehow
		return nil, nil, fmt.Errorf("request to /cluster/tasks resulted in %+v", res)
	}

	most_recent_task := map[uint]uint{}
	expected_state := map[uint]string{}

	for _, v := range body["data"].([]any) {
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
			if task.EndTime > most_recent_task[task.VMID] { // if the task's end time is later than the most recent one encountered
				most_recent_task[task.VMID] = task.EndTime            // update the most recent task
				if task.Type == "qmstart" || task.Type == "vzstart" { // if the task was a start task, update the expected state to running
					expected_state[task.VMID] = "running"
				} else if task.Type == "qmstop" || task.Type == "vzstop" { // if the task was a stop task, update the expected state to stopped
					expected_state[task.VMID] = "stopped"
				}
			}
		}
	}

	for vmid, expected_state := range expected_state { // for the expected states from recent tasks
		if instances[vmid].Status != expected_state { // if the current node's state from /cluster/resources differs from expected state
			// get /status/current which is updated faster than /cluster/resources
			instance := instances[vmid]
			path := fmt.Sprintf("/proxmox/nodes/%s/%s/%d/status/current", instance.Node, instance.Type, instance.VMID)
			body = map[string]any{}
			res, code, err := common.RequestGetAPI(path, ctx, &body)
			if err != nil {
				return nil, nil, err
			}
			if code != 200 { // if we did not successfully retrieve tasks, then return 500 because auth was 1 but was invalid somehow
				return nil, nil, fmt.Errorf("request to %s resulted in %+v", path, res)
			}

			status := InstanceStatus{}
			mapstructure.Decode(body["data"], &status)

			instance.Status = status.Status
			instances[vmid] = instance
		}
	}

	return instances, nodes, nil
}
