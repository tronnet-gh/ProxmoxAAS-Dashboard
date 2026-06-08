package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	"time"

	"github.com/gin-gonic/gin"
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

func HandleGETBackups(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		vm_path, err := common.ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		backups, err := GetInstanceBackups(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance backups: %s", err.Error()))
		}

		config, err := GetInstanceConfig(vm_path, auth) // only used for the VM's name
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance config: %s", err.Error()))
		}

		c.HTML(http.StatusOK, "html/backups.html", gin.H{
			"global":  common.Global,
			"page":    "backups",
			"backups": backups,
			"config":  config,
		})
	} else {
		c.Redirect(http.StatusFound, "/login")
	}
}

func HandleGETBackupsFragment(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil { // user should be authed, try to return index with population
		vm_path, err := common.ExtractVMPath(c)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		backups, err := GetInstanceBackups(vm_path, auth)
		if err != nil {
			common.HandleNonFatalError(c, fmt.Errorf("error encountered getting instance backups: %s", err.Error()))
		}

		c.Header("Content-Type", "text/plain")
		err = common.TMPL.ExecuteTemplate(c.Writer, "html/backups-backups.go.tmpl", gin.H{
			"backups": backups,
		})
		if err != nil {
			c.Status(http.StatusInternalServerError)
		} else {
			c.Status(http.StatusOK)
		}
	} else { // return 401
		c.Status(http.StatusUnauthorized)
	}
}

func GetInstanceBackups(vm common.VMPath, auth common.Auth) ([]InstanceBackup, error) {
	backups := []InstanceBackup{}
	path := fmt.Sprintf("/cluster/%s/%s/%s/backup", vm.Node, vm.Type, vm.VMID)
	ctx := common.GetRequestContextFromCookies(auth)
	body := []any{}
	res, code, err := common.RequestGetAPI(path, ctx, &body)
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
		size, prefix := common.FormatNumber(backups[i].Size, 1024)
		backups[i].SizeFormatted = fmt.Sprintf("%s %sB", size, prefix)

		t := time.Unix(backups[i].CTime, 0)
		backups[i].TimeFormatted = t.Format("02-01-06 15:04:05")
	}

	return backups, nil
}
