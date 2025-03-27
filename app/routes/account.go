package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

type Account struct {
	Username string
	Pools    map[string]bool
	Nodes    map[string]bool
	VMID     struct {
		Min int
		Max int
	}
}

func HandleGETAccount(c *gin.Context) {
	username, token, csrf, err := common.GetAuth(c)
	if err == nil {
		account, err := GetUserAccount(username, token, csrf)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		c.HTML(http.StatusOK, "html/account.html", gin.H{
			"global":  common.Global,
			"page":    "account",
			"account": account,
		})
	} else {
		c.Redirect(http.StatusFound, "/login.html") // if user is not authed, redirect user to login page
	}
}

func GetUserAccount(username string, token string, csrf string) (Account, error) {
	account := Account{}

	ctx := common.RequestContext{
		Cookies: map[string]string{
			"username":            username,
			"PVEAuthCookie":       token,
			"CSRFPreventionToken": csrf,
		},
		Body: map[string]any{},
	}
	res, code, err := common.RequestGetAPI("/user/config/cluster", ctx)
	if err != nil {
		return account, err
	}
	if code != 200 {
		return account, fmt.Errorf("request to /user/config/cluster resulted in %+v", res)
	}

	err = mapstructure.Decode(ctx.Body, &account)
	if err != nil {
		return account, err
	} else {
		account.Username = username
		return account, nil
	}
}
