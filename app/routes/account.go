package routes

import (
	"fmt"
	"net/http"
	paas "proxmoxaas-common-lib"
	"proxmoxaas-dashboard/app/common"

	"github.com/gerow/go-color"
	"github.com/gin-gonic/gin"
	"github.com/go-viper/mapstructure/v2"
)

type Account struct {
	Username string
	Pools    map[string]paas.Pool
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
	Avail    string
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
		pools, err := GetUserPools(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		for poolname, pool := range pools {
			// for each resource category
			for category := range pool.Resources {
				// for each resource in each category
				for resource, v := range pool.Resources[category].(map[string]any) {
					// create a resource chart for resource depending on resource type
					switch t := v.(type) {
					case NumericResource:
						avail, prefix := common.FormatNumber(t.Total.Avail*t.Multiplier, t.Base)
						pools[poolname].Resources[category].(map[string]any)[resource] = ResourceChart{
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
						pools[poolname].Resources[category].(map[string]any)[resource] = ResourceChart{
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
							avail := fmt.Sprintf("%d", r.Avail)
							l.Resources = append(l.Resources, ResourceChart{
								Type:     t.Type,
								Display:  t.Display,
								Name:     r.Name,
								Used:     r.Used,
								Max:      r.Max,
								Avail:    avail, // usually an int
								Unit:     "",
								ColorHex: InterpolateColorHSV(Green, Red, float64(r.Used)/float64(r.Max)).ToHTML(),
							})
						}
						pools[poolname].Resources[category].(map[string]any)[resource] = l
					}
				}
			}
		}

		c.HTML(http.StatusOK, "html/account.html", gin.H{
			"global": common.Global,
			"page":   "account",
			"account": map[string]any{
				"Username": auth.Username,
				"Pools":    pools,
			},
		})
	} else {
		c.Redirect(http.StatusFound, "/login") // if user is not authed, redirect user to login page
	}
}

func GetUserPools(auth common.Auth) (map[string]paas.Pool, error) {
	pools := map[string]paas.Pool{}

	// get all pools
	ctx := common.GetRequestContextFromCookies(auth)
	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/access/pools", ctx, &body)
	if err != nil {
		return pools, err
	}
	if code != 200 {
		return pools, fmt.Errorf("request to /access/pools resulted in %+v", res)
	}
	err = mapstructure.Decode(body["pools"].(map[string]any), &pools)
	if err != nil {
		return pools, err
	}

	// get global config for resource type metadata
	body = map[string]any{}
	// get resource meta data
	res, code, err = common.RequestGetAPI("/global/config/resources", ctx, &body)
	if err != nil {
		return pools, err
	}
	if code != 200 {
		return pools, fmt.Errorf("request to /global/config/resources resulted in %+v", res)
	}
	meta := body["resources"].(map[string]any)

	// for each pool
	for poolname, pool := range pools {
		// for each resource in pool data
		for k, v := range pool.Resources {
			m := meta[k].(map[string]any)
			t := m["type"].(string)
			r := v.(map[string]any)
			category := m["category"].(string)

			// create a category if it does not already exist
			if _, ok := pool.Resources[category]; !ok {
				pool.Resources[category] = map[string]any{}
			}

			// depending on type, decode the pool data into the corresponding resource type
			switch t {
			case "numeric":
				n := NumericResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pools[poolname].Resources[category].(map[string]any)[k] = n
			case "storage":
				n := StorageResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pools[poolname].Resources[category].(map[string]any)[k] = n
			case "list":
				n := ListResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pools[poolname].Resources[category].(map[string]any)[k] = n
			}

			// delete the old entry, only categories should be left at the end of the loop
			delete(pools[poolname].Resources, k)
		}
	}

	return pools, nil
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
