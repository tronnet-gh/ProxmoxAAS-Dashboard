package routes

import (
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
)

func HandleGETInstance(c *gin.Context) {
	_, _, _, err := common.GetAuth(c)
	if err == nil {
		c.HTML(http.StatusOK, "html/instance.html", gin.H{
			"global": common.Global,
			"page":   "instance",
		})
	} else {
		c.Redirect(http.StatusFound, "/login.html")
	}
}
