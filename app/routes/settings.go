package routes

import (
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
)

func HandleGETSettings(c *gin.Context) {
	_, _, _, err := common.GetAuth(c)
	if err == nil {
		c.HTML(http.StatusOK, "html/settings.html", gin.H{
			"global": common.Global,
			"page":   "settings",
		})
	} else {
		c.Redirect(http.StatusFound, "/login.html")
	}
}
