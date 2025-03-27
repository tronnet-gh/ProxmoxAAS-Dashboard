package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

// used when requesting GET /access/domains
type GetRealmsBody struct {
	Data []Realm `json:"data"`
}

// stores each realm's data
type Realm struct {
	Default int    `json:"default"`
	Realm   string `json:"realm"`
	Comment string `json:"comment"`
}

func GetLoginRealms() ([]Realm, error) {
	realms := []Realm{}

	ctx := common.RequestContext{
		Cookies: nil,
		Body:    map[string]any{},
	}
	res, code, err := common.RequestGetAPI("/proxmox/access/domains", ctx)
	if err != nil {
		//HandleNonFatalError(c, err)
		return realms, err
	}
	if code != 200 { // we expect /access/domains to always be avaliable
		//HandleNonFatalError(c, err)
		return realms, fmt.Errorf("request to /proxmox/access/do9mains resulted in %+v", res)
	}

	for _, v := range ctx.Body["data"].([]any) {
		v = v.(map[string]any)
		realm := Realm{}
		err := mapstructure.Decode(v, &realm)
		if err != nil {
			return realms, err
		}
		realms = append(realms, realm)
	}

	return realms, nil
}

func HandleGETLogin(c *gin.Context) {
	realms, err := GetLoginRealms()
	if err != nil {
		common.HandleNonFatalError(c, err)
	}

	sel := common.Select{
		ID:   "realm",
		Name: "realm",
	}

	for _, realm := range realms {
		sel.Options = append(sel.Options, common.Option{
			Selected: realm.Default != 0,
			Value:    realm.Realm,
			Display:  realm.Comment,
		})
	}

	c.HTML(http.StatusOK, "html/login.html", gin.H{
		"global": common.Global,
		"page":   "login",
		"realms": sel,
	})
}
