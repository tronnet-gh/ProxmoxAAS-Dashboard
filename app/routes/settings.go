package routes

import (
	"bytes"
	"net/http"
	"proxmoxaas-dashboard/app/common"
)

func HandleGETSettings(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil {
		_, err := GetUserBasic(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		w.Header().Set("Content-Type", "text/html")
		body := bytes.Buffer{}
		err = common.TMPL.ExecuteTemplate(&body, "html/settings.html", map[string]any{
			"global": common.Global,
			"page":   "settings",
		})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		} else {
			w.Write(body.Bytes())
			return
		}
	} else {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
}
