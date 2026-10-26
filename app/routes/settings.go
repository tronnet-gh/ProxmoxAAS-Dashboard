package routes

import (
	"net/http"
	"proxmoxaas-dashboard/app/common"
	paas "proxmoxaas-dashboard/proxmoxaas-common-lib"
)

func HandleGETSettings(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		_, err := GetUserBasic(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		paas.HTTPExecuteHTMLTemplate(w, common.TMPL, "html/settings.html", map[string]any{
			"global": common.Global,
			"page":   "settings",
		})
	} else {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
}
