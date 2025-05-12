package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	"slices"
	"sort"

	fabric "proxmoxaas-fabric/app"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

func HandleGETConfig(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		if config.Type == "VM" { // if VM, fetch CPU types from node
			config.ProctypeSelect, err = GetCPUTypes(vm_path, auth)
			if err != nil {
				common.HandleNonFatalError(c, fmt.Errorf("error encountered getting proctypes: %s", err.Error()))
			}
		}
		for i, cpu := range config.ProctypeSelect.Options {
			if cpu.Value == config.Proctype {
				config.ProctypeSelect.Options[i].Selected = true
			}
		}

		c.HTML(http.StatusOK, "html/config.html", gin.H{
			"global": common.Global,
			"page":   "config",
			"config": config,
		})
	} else {
		c.Redirect(http.StatusFound, "/login")
	}
}

func HandleGETConfigVolumesFragment(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/config-volumes.frag", gin.H{
			"config": config,
		})
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigNetsFragment(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/config-nets.frag", gin.H{
			"config": config,
		})
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigDevicesFragment(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/config-devices.frag", gin.H{
			"config": config,
		})
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigBootFragment(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		common.TMPL.ExecuteTemplate(c.Writer, "html/config-boot.frag", gin.H{
			"config": config,
		})
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusUnauthorized)
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

type VMPath struct {
	Node string
	Type string
	VMID string
}

// imported types from fabric

type InstanceConfig struct {
	Type     fabric.InstanceType       `json:"type"`
	Name     string                    `json:"name"`
	Proctype string                    `json:"cpu"`
	Cores    uint64                    `json:"cores"`
	Memory   uint64                    `json:"memory"`
	Swap     uint64                    `json:"swap"`
	Volumes  map[string]*fabric.Volume `json:"volumes"`
	Nets     map[string]*fabric.Net    `json:"nets"`
	Devices  map[string]*fabric.Device `json:"devices"`
	Boot     fabric.BootOrder          `json:"boot"`
	// overrides
	ProctypeSelect common.Select
}

func GetInstanceConfig(vm VMPath, auth common.Auth) (InstanceConfig, error) {
	config := InstanceConfig{}
	path := fmt.Sprintf("/cluster/%s/%s/%s", vm.Node, vm.Type, vm.VMID)
	ctx := common.RequestContext{
		Cookies: map[string]string{
			"username":            auth.Username,
			"PVEAuthCookie":       auth.Token,
			"CSRFPreventionToken": auth.CSRF,
		},
		Body: map[string]any{},
	}
	res, code, err := common.RequestGetAPI(path, ctx)
	if err != nil {
		return config, err
	}
	if code != 200 {
		return config, fmt.Errorf("request to %s resulted in %+v", path, res)
	}

	err = mapstructure.Decode(ctx.Body, &config)
	if err != nil {
		return config, err
	}

	config.Memory = config.Memory / (1024 * 1024) // memory in MiB
	config.Swap = config.Swap / (1024 * 1024)     // swap in MiB

	return config, nil
}

type GlobalConfig struct {
	CPU struct {
		Whitelist bool
	}
}

type UserConfig struct {
	CPU struct {
		Global []CPUConfig
		Nodes  map[string][]CPUConfig
	}
}

type CPUConfig struct {
	Name string
}

func GetCPUTypes(vm VMPath, auth common.Auth) (common.Select, error) {
	cputypes := common.Select{
		ID:       "proctype",
		Required: true,
	}

	// get global resource config
	ctx := common.RequestContext{
		Cookies: map[string]string{
			"username":            auth.Username,
			"PVEAuthCookie":       auth.Token,
			"CSRFPreventionToken": auth.CSRF,
		},
		Body: map[string]any{},
	}
	path := "/global/config/resources"
	res, code, err := common.RequestGetAPI(path, ctx)
	if err != nil {
		return cputypes, err
	}
	if code != 200 {
		return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
	}
	global := GlobalConfig{}
	err = mapstructure.Decode(ctx.Body["resources"], &global)
	if err != nil {
		return cputypes, err
	}

	// get user resource config
	ctx.Body = map[string]any{}
	path = "/user/config/resources"
	res, code, err = common.RequestGetAPI(path, ctx)
	if err != nil {
		return cputypes, err
	}
	if code != 200 {
		return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
	}
	user := UserConfig{}
	err = mapstructure.Decode(ctx.Body, &user)
	if err != nil {
		return cputypes, err
	}

	// use node specific rules if present, otherwise use global rules
	var userCPU []CPUConfig
	if _, ok := user.CPU.Nodes[vm.Node]; ok {
		userCPU = user.CPU.Nodes[vm.Node]
	} else {
		userCPU = user.CPU.Global
	}

	if global.CPU.Whitelist { // cpu is a whitelist
		for _, cpu := range userCPU { // for each cpu type in user config add it to the options
			cputypes.Options = append(cputypes.Options, common.Option{
				Display: cpu.Name,
				Value:   cpu.Name,
			})
		}
	} else { // cpu is a blacklist
		// get the supported cpu types from the node
		ctx.Body = map[string]any{}
		path = fmt.Sprintf("/proxmox/nodes/%s/capabilities/qemu/cpu", vm.Node)
		res, code, err = common.RequestGetAPI(path, ctx)
		if err != nil {
			return cputypes, err
		}
		if code != 200 {
			return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
		}
		supported := struct {
			data []CPUConfig
		}{}
		err = mapstructure.Decode(ctx.Body, supported)
		if err != nil {
			return cputypes, err
		}

		// for each node supported cpu type, if it is NOT in the user's config (aka is not blacklisted) then add it to the options
		for _, cpu := range supported.data {
			contains := slices.ContainsFunc(userCPU, func(c CPUConfig) bool {
				return c.Name == cpu.Name
			})
			if !contains {
				cputypes.Options = append(cputypes.Options, common.Option{
					Display: cpu.Name,
					Value:   cpu.Name,
				})
			}
		}
	}

	// sort the options by lexicographical order
	sort.Slice(cputypes.Options, func(i, j int) bool {
		return cputypes.Options[i].Display < cputypes.Options[j].Display
	})

	return cputypes, nil
}
