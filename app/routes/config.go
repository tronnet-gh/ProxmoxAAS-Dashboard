package routes

import (
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
)

func HandleGETConfig(c *gin.Context) {
	_, err := common.GetAuth(c)
	if err == nil {
		c.HTML(http.StatusOK, "html/config.html", gin.H{
			"global": common.Global,
			"page":   "config",
		})
	} else {
		c.Redirect(http.StatusFound, "/login.html")
	}
}
