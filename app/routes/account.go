package routes

import (
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"

	"github.com/gerow/go-color"
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
	Resources map[string]map[string]any
}

// numerical constraint
type Constraint struct {
	Max   int64
	Used  int64
	Avail int64
}

// match constraint
type Match struct {
	Name  string
	Match string
	Max   int64
	Used  int64
	Avail int64
}

type NumericResource struct {
	Type       string
	Name       string
	Multiplier int64
	Base       int64
	Compact    bool
	Unit       string
	Display    bool
	Global     Constraint
	Nodes      map[string]Constraint
	Total      Constraint
	Category   string
}

type StorageResource struct {
	Type       string
	Name       string
	Multiplier int64
	Base       int64
	Compact    bool
	Unit       string
	Display    bool
	Disks      []string
	Global     Constraint
	Nodes      map[string]Constraint
	Total      Constraint
	Category   string
}

type ListResource struct {
	Type      string
	Whitelist bool
	Display   bool
	Global    []Match
	Nodes     map[string][]Match
	Total     []Match
	Category  string
}

type ResourceChart struct {
	Type     string
	Display  bool
	Name     string
	Used     int64
	Max      int64
	Avail    float64
	Prefix   string
	Unit     string
	ColorHex string
}

var Red = color.RGB{
	R: 1,
	G: 0,
	B: 0,
}

var Green = color.RGB{
	R: 0,
	G: 1,
	B: 0,
}

func HandleGETAccount(c *gin.Context) {
	auth, err := common.GetAuth(c)
	if err == nil {
		account, err := GetUserAccount(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		// for each resource category, create a resource chart
		for category, resources := range account.Resources {
			for resource, v := range resources {
				switch t := v.(type) {
				case NumericResource:
					avail, prefix := common.FormatNumber(t.Total.Avail*t.Multiplier, t.Base)
					account.Resources[category][resource] = ResourceChart{
						Type:     t.Type,
						Display:  t.Display,
						Name:     t.Name,
						Used:     t.Total.Used,
						Max:      t.Total.Max,
						Avail:    avail,
						Prefix:   prefix,
						Unit:     t.Unit,
						ColorHex: InterpolateColorHSV(Green, Red, float64(t.Total.Used)/float64(t.Total.Max)).ToHTML(),
					}
				case StorageResource:
					avail, prefix := common.FormatNumber(t.Total.Avail*t.Multiplier, t.Base)
					account.Resources[category][resource] = ResourceChart{
						Type:     t.Type,
						Display:  t.Display,
						Name:     t.Name,
						Used:     t.Total.Used,
						Max:      t.Total.Max,
						Avail:    avail,
						Prefix:   prefix,
						Unit:     t.Unit,
						ColorHex: InterpolateColorHSV(Green, Red, float64(t.Total.Used)/float64(t.Total.Max)).ToHTML(),
					}
				case ListResource:
					l := struct {
						Type      string
						Display   bool
						Resources []ResourceChart
					}{
						Type:      t.Type,
						Display:   t.Display,
						Resources: []ResourceChart{},
					}

					for _, r := range t.Total {
						l.Resources = append(l.Resources, ResourceChart{
							Type:     t.Type,
							Display:  t.Display,
							Name:     r.Name,
							Used:     r.Used,
							Max:      r.Max,
							Avail:    float64(r.Avail), // usually an int
							Unit:     "",
							ColorHex: InterpolateColorHSV(Green, Red, float64(r.Used)/float64(r.Max)).ToHTML(),
						})
					}
					account.Resources[category][resource] = l
				}
			}
		}

		c.HTML(http.StatusOK, "html/account.html", gin.H{
			"global":  common.Global,
			"page":    "account",
			"account": account,
		})
	} else {
		c.Redirect(http.StatusFound, "/login") // if user is not authed, redirect user to login page
	}
}

func GetUserAccount(auth common.Auth) (Account, error) {
	account := Account{
		Resources: map[string]map[string]any{},
	}

	ctx := common.RequestContext{
		Cookies: map[string]string{
			"username":            auth.Username,
			"PVEAuthCookie":       auth.Token,
			"CSRFPreventionToken": auth.CSRF,
		},
	}

	// get user account basic data
	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/user/config/cluster", ctx, &body)
	if err != nil {
		return account, err
	}
	if code != 200 {
		return account, fmt.Errorf("request to /user/config/cluster resulted in %+v", res)
	}
	err = mapstructure.Decode(body, &account)
	if err != nil {
		return account, err
	} else {
		account.Username = auth.Username
	}

	body = map[string]any{}
	// get user resources
	res, code, err = common.RequestGetAPI("/user/dynamic/resources", ctx, &body)
	if err != nil {
		return account, err
	}
	if code != 200 {
		return account, fmt.Errorf("request to /user/dynamic/resources resulted in %+v", res)
	}
	resources := body

	body = map[string]any{}
	// get resource meta data
	res, code, err = common.RequestGetAPI("/global/config/resources", ctx, &body)
	if err != nil {
		return account, err
	}
	if code != 200 {
		return account, fmt.Errorf("request to /global/config/resources resulted in %+v", res)
	}
	meta := body["resources"].(map[string]any)

	// build each resource by its meta type
	for k, v := range meta {
		m := v.(map[string]any)
		t := m["type"].(string)
		r := resources[k].(map[string]any)
		category := m["category"].(string)
		if _, ok := account.Resources[category]; !ok {
			account.Resources[category] = map[string]any{}
		}
		if t == "numeric" {
			n := NumericResource{}
			n.Type = t
			err_m := mapstructure.Decode(m, &n)
			err_r := mapstructure.Decode(r, &n)
			if err_m != nil || err_r != nil {
				return account, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
			}
			account.Resources[category][k] = n
		} else if t == "storage" {
			n := StorageResource{}
			n.Type = t
			err_m := mapstructure.Decode(m, &n)
			err_r := mapstructure.Decode(r, &n)
			if err_m != nil || err_r != nil {
				return account, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
			}
			account.Resources[category][k] = n
		} else if t == "list" {
			n := ListResource{}
			n.Type = t
			err_m := mapstructure.Decode(m, &n)
			err_r := mapstructure.Decode(r, &n)
			if err_m != nil || err_r != nil {
				return account, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
			}
			account.Resources[category][k] = n
		}
	}

	return account, nil
}

// interpolate between min and max by normalized (0 - 1) val
func InterpolateColorHSV(min color.RGB, max color.RGB, val float64) color.RGB {
	minhsl := min.ToHSL()
	maxhsl := max.ToHSL()
	interphsl := color.HSL{
		H: (1-val)*minhsl.H + (val)*maxhsl.H,
		S: (1-val)*minhsl.S + (val)*maxhsl.S,
		L: (1-val)*minhsl.L + (val)*maxhsl.L,
	}
	return interphsl.ToRGB()
}
