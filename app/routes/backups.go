package routes

import (
	"fmt"
	"net/http"
	paas "proxmoxaas-common-lib"
	"proxmoxaas-dashboard/app/common"
	"time"

	"github.com/go-viper/mapstructure/v2"
)

type InstanceBackup struct {
	Volid         string `json:"volid"`
	Notes         string `json:"notes"`
	Size          int64  `json:"size"`
	CTime         int64  `json:"ctime"`
	SizeFormatted string
	TimeFormatted string
}

func HandleGETBackups(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		backups, err := GetInstanceBackups(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance backups: %s", err.Error()))
			return
		}

		config, err := GetInstanceConfig(vm_path, auth) // only used for the VM's name
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLTemplate(w, common.TMPL, "html/backups.html", map[string]any{
			"global":  common.Global,
			"page":    "backups",
			"backups": backups,
			"config":  config,
		})
	} else {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
}

func HandleGETBackupsFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil { // user should be authed, try to return index with population
		vm_path, err := common.GetInstancePathFromRequest(r)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		backups, err := GetInstanceBackups(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(w, fmt.Errorf("error encountered getting instance backups: %s", err.Error()))
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/backups-backups.go.tmpl", map[string]any{
			"backups": backups,
		})
	} else { // return 401
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

func GetInstanceBackups(vm paas.InstancePath, auth paas.Auth) ([]InstanceBackup, error) {
	backups := []InstanceBackup{}
	path := fmt.Sprintf("/cluster/%s/%s/%d/backup", vm.NodeName, string(vm.InstanceType), uint64(vm.InstanceID))
	body := []any{}
	res, code, err := common.RequestGetAPI(path, &auth, &body)
	if err != nil {
		return backups, err
	}
	if code != 200 {
		return backups, fmt.Errorf("request to %s resulted in %+v", path, res)
	}

	err = mapstructure.Decode(body, &backups)
	if err != nil {
		return backups, err
	}

	for i := range backups {
		size, prefix := paas.FormatNumber(paas.SafeUint64(backups[i].Size), paas.Base1024)
		backups[i].SizeFormatted = fmt.Sprintf("%s %sB", size, prefix)

		t := time.Unix(backups[i].CTime, 0)
		backups[i].TimeFormatted = t.Format("02-01-06 15:04:05")
	}

	return backups, nil
}
