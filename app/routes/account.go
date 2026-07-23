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

type Pool struct {
	paas.Pool      `mapstructure:",squash"`
	ResourceCharts map[string]map[string]any
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
	auth, err := common.GetAuthFromRequest(c)
	if err == nil {
		user, err := GetUserBasic(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		pools, err := GetUserPools(auth)
		if err != nil {
			common.HandleNonFatalError(c, err)
			return
		}

		c.HTML(http.StatusOK, "html/account.html", gin.H{
			"global": common.Global,
			"page":   "account",
			"user":   user,
			"pools":  pools,
		})
	} else {
		c.Redirect(http.StatusFound, "/login") // if user is not authed, redirect user to login page
	}
}

func GetUserBasic(auth paas.Auth) (paas.User, error) {
	user := paas.User{}
	body := map[string]any{}
	res, code, err := common.RequestGetAPI(fmt.Sprintf("/access/users/%s", auth.Username), &auth, &body)
	if err != nil {
		return user, err
	}
	if code != 200 {
		return user, fmt.Errorf("request to /access/pools resulted in %+v", res)
	}
	err = mapstructure.Decode(body["user"], &user)
	return user, err
}

func GetUserPools(auth paas.Auth) (map[string]Pool, error) {
	pools := map[string]Pool{}

	// get all pools
	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/access/pools", &auth, &body)
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
	res, code, err = common.RequestGetAPI("/global/config/resources", &auth, &body)
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

		// create pool charts map
		pool.ResourceCharts = make(map[string]map[string]any)

		for k, v := range pool.Resources {
			m := meta[k].(map[string]any)
			t := m["type"].(string)
			r := v.(map[string]any)
			category := m["category"].(string)

			// create a category if it does not already exist
			if _, ok := pool.ResourceCharts[category]; !ok {
				pool.ResourceCharts[category] = map[string]any{}
			}

			// depending on type, decode the apool data into the corresponding resource type
			switch t {
			case "numeric":
				n := paas.NumericResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pool.ResourceCharts[category][k] = n
			case "storage":
				n := paas.StorageResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pool.ResourceCharts[category][k] = n
			case "list":
				n := paas.ListResource{}
				n.Type = t
				err_m := mapstructure.Decode(m, &n)
				err_r := mapstructure.Decode(r, &n)
				if err_m != nil || err_r != nil {
					return pools, fmt.Errorf("%s\n%s", err_m.Error(), err_r.Error())
				}
				pool.ResourceCharts[category][k] = n
			}

			// delete the old entry, only categories should be left at the end of the loop
			//delete(pools[poolname].Resources, k)
		}
		pools[poolname] = pool
	}

	err = FormatPoolResourceCharts(&pools)
	if err != nil {
		return pools, err
	}

	return pools, nil
}

func FormatPoolResourceCharts(pools *map[string]Pool) error {
	for poolname, pool := range *pools {
		// for each resource category
		for categoryname, category := range pool.ResourceCharts {
			// for each resource in each category
			for resourcename, resource := range category {
				// create a resource chart for resource depending on resource type
				switch t := resource.(type) {
				case paas.NumericResource:
					avail, prefix := paas.FormatNumber(paas.SafeUint64(t.Total.Avail*t.Multiplier), t.Base)
					(*pools)[poolname].ResourceCharts[categoryname][resourcename] = ResourceChart{
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
				case paas.StorageResource:
					avail, prefix := paas.FormatNumber(paas.SafeUint64(t.Total.Avail*t.Multiplier), t.Base)
					(*pools)[poolname].ResourceCharts[categoryname][resourcename] = ResourceChart{
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
				case paas.ListResource:
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
					(*pools)[poolname].ResourceCharts[categoryname][resourcename] = l
				}
			}
		}
	}

	return nil
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
