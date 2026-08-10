package routes

import (
	"fmt"
	"net/http"
	paas "proxmoxaas-common-lib"
	"proxmoxaas-dashboard/app/common"
	"slices"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

type InstanceConfig struct {
	paas.Instance `mapstructure:",squash"`
	// overrides
	ProctypeSelect common.Select
}

type GlobalConfig struct {
	CPU struct {
		Whitelist bool
	}
}

type PoolConfig struct {
	CPU struct {
		Global []paas.Match
		Nodes  map[string][]paas.Match
	}
}

func HandleGETConfig(c *gin.Context) {
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		if config.Type == "VM" { // if VM, fetch CPU types from node
			config.ProctypeSelect, err = GetCPUTypes(vm_path, config.Pool, auth)
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
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		err = common.TMPL.ExecuteTemplate(c.Writer, "html/config-volumes.go.tmpl", gin.H{
			"config": config,
		})
		if err != nil {
			c.Status(http.StatusInternalServerError)
		} else {
			c.Status(http.StatusOK)
		}
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigNetsFragment(c *gin.Context) {
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		err = common.TMPL.ExecuteTemplate(c.Writer, "html/config-nets.go.tmpl", gin.H{
			"config": config,
		})
		if err != nil {
			c.Status(http.StatusInternalServerError)
		} else {
			c.Status(http.StatusOK)
		}
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigDevicesFragment(c *gin.Context) {
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		err = common.TMPL.ExecuteTemplate(c.Writer, "html/config-devices.go.tmpl", gin.H{
			"config": config,
		})
		if err != nil {
			c.Status(http.StatusInternalServerError)
		} else {
			c.Status(http.StatusOK)
		}
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func HandleGETConfigBootFragment(c *gin.Context) {
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		err = common.TMPL.ExecuteTemplate(c.Writer, "html/config-boot.go.tmpl", gin.H{
			"config": config,
		})
		if err != nil {
			c.Status(http.StatusInternalServerError)
		} else {
			c.Status(http.StatusOK)
		}
	} else {
		c.Status(http.StatusUnauthorized)
	}
}

func GetInstanceConfig(vm paas.InstancePath, auth paas.Auth) (InstanceConfig, error) {
	config := InstanceConfig{}
	path := fmt.Sprintf("/cluster/%s/%s/%d/", vm.NodeName, string(vm.InstanceType), uint64(vm.InstanceID))
	body := map[string]any{}
	res, code, err := common.RequestGetAPI(path, &auth, &body)
	if err != nil {
		return config, err
	}
	if code != 200 {
		return config, fmt.Errorf("request to %s resulted in %+v", path, res)
	}

	err = mapstructure.Decode(body, &config)
	if err != nil {
		return config, err
	}

	config.Memory = config.Memory / (1024 * 1024) // memory in MiB
	config.Swap = config.Swap / (1024 * 1024)     // swap in MiB

	return config, nil
}

func GetCPUTypes(vm paas.InstancePath, pool string, auth paas.Auth) (common.Select, error) {
	cputypes := common.Select{
		ID:       "proctype",
		Required: true,
	}

	// get global resource config
	body := map[string]any{}
	path := "/global/config/resources"
	res, code, err := common.RequestGetAPI(path, &auth, &body)
	if err != nil {
		return cputypes, err
	}
	if code != 200 {
		return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
	}
	globalConfig := GlobalConfig{}
	err = mapstructure.Decode(body["resources"], &globalConfig)
	if err != nil {
		return cputypes, err
	}

	// get pool resource config
	body = map[string]any{}
	path = fmt.Sprintf("/access/pools/%s", pool)
	res, code, err = common.RequestGetAPI(path, &auth, &body)
	if err != nil {
		return cputypes, err
	}
	if code != 200 {
		return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
	}
	poolCPUConfig := PoolConfig{}
	err = mapstructure.Decode(body["pool"].(map[string]any)["resources"], &poolCPUConfig)
	if err != nil {
		return cputypes, err
	}

	// use node specific rules if present, otherwise use global rules
	var userCPU []paas.Match
	if _, ok := poolCPUConfig.CPU.Nodes[vm.NodeName]; ok {
		userCPU = poolCPUConfig.CPU.Nodes[vm.NodeName]
	} else {
		userCPU = poolCPUConfig.CPU.Global
	}

	if globalConfig.CPU.Whitelist { // cpu is a whitelist
		for _, cpu := range userCPU { // for each cpu type in user config add it to the options
			cputypes.Options = append(cputypes.Options, common.Option{
				Display: cpu.Name,
				Value:   cpu.Name,
			})
		}
	} else { // cpu is a blacklist
		// get the supported cpu types from the node
		body = map[string]any{}
		path = fmt.Sprintf("/proxmox/nodes/%s/capabilities/qemu/cpu", vm.NodeName)
		res, code, err = common.RequestGetAPI(path, &auth, &body)
		if err != nil {
			return cputypes, err
		}
		if code != 200 {
			return cputypes, fmt.Errorf("request to %s resulted in %+v", path, res)
		}
		supported := struct {
			data []paas.Match
		}{}
		err = mapstructure.Decode(body, supported)
		if err != nil {
			return cputypes, err
		}

		// for each node supported cpu type, if it is NOT in the user's config (aka is not blacklisted) then add it to the options
		for _, cpu := range supported.data {
			contains := slices.ContainsFunc(userCPU, func(c paas.Match) bool {
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
