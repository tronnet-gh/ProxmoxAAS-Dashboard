package routes

import (
	"fmt"
	"net/http"
	paas "proxmoxaas-common-lib"
	"proxmoxaas-dashboard/app/common"
	"slices"
	"sort"

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

func HandleGETConfig(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		if config.Type == "VM" { // if VM, fetch CPU types from node
			config.ProctypeSelect, err = GetCPUTypes(vm_path, config.Pool, auth)
			if err != nil {
				common.HandleNonFatalError(w, fmt.Errorf("error encountered getting proctypes: %s", err.Error()))
				return
			}
		}
		for i, cpu := range config.ProctypeSelect.Options {
			if cpu.Value == config.Proctype {
				config.ProctypeSelect.Options[i].Selected = true
			}
		}

		paas.HTTPExecuteHTMLTemplate(w, common.TMPL, "html/config.html", map[string]any{
			"global": common.Global,
			"page":   "config",
			"config": config,
		})
	} else {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
}

func HandleGETConfigVolumesFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/config-volumes.go.tmpl", map[string]any{
			"config": config,
		})
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

func HandleGETConfigNetsFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/config-nets.go.tmpl", map[string]any{
			"config": config,
		})
	} else { // return 401
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

func HandleGETConfigDevicesFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/config-devices.go.tmpl", map[string]any{
			"config": config,
		})
	} else { // return 401
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

func HandleGETConfigBootFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		config, err := GetInstanceConfig(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/config-boot.go.tmpl", map[string]any{
			"config": config,
		})
	} else { // return 401
		w.WriteHeader(http.StatusUnauthorized)
		return
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
