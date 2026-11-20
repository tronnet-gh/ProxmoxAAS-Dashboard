package routes

import (
	"cmp"
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	paas "proxmoxaas-dashboard/proxmoxaas-common-lib"
	"slices"

	"github.com/go-viper/mapstructure/v2"
)

type AdminPool struct {
	paas.Pool     `mapstructure:",squash"`
	ClientGroups  []paas.Group
	AdminGroups   []paas.Group
	ResourceCells []string // one cell per AdminResourceHeader, in the same order
}

type AdminGroup struct {
	paas.Group `mapstructure:",squash"`
}

type UserCard struct {
	Username paas.Username
	CN       string
	SN       string
	Mail     string
	Enable   bool
	Realm    string
}

type AdminResourceHeader struct {
	Key        string
	Type       string
	Display    bool
	Name       string
	Multiplier int64
	Base       uint64
	Unit       string
	Category   string
}

func HandleGETAdmin(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil { // user should be authed, try to return admin with population
		pools, headers, err := GetAdminPools(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		groups, err := GetAdminGroups(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		users, err := GetAdminUsers(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		paas.HTTPExecuteHTMLTemplate(w, common.TMPL, "html/admin.html", map[string]any{
			"global":  common.Global,
			"page":    "admin",
			"pools":   pools,
			"headers": headers,
			"groups":  groups,
			"users":   users,
		})
	} else { // if user is not authed, redirect user to login page
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
}

func HandleGETAdminPoolsFragment(w http.ResponseWriter, r *http.Request) {
	auth, err := common.GetAuthFromRequest(r)
	if err == nil { // user should be authed, try to return pools fragment
		pools, _, err := GetAdminPools(auth)
		if err != nil {
			common.HandleNonFatalError(w, err)
			return
		}

		paas.HTTPExecuteHTMLFragmentTemplate(w, common.TMPL, "html/admin-pools.go.tmpl", map[string]any{
			"pools": pools,
		})
	} else { // return 401
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

func GetAdminPools(auth paas.Auth) (map[string]AdminPool, []AdminResourceHeader, error) {
	pools := map[string]AdminPool{}

	// get all pools the user is an admin of
	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/access/pools?role=admin", &auth, &body)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 {
		return nil, nil, fmt.Errorf("request to /access/pools resulted in %+v", res)
	}
	err = mapstructure.Decode(body["pools"].(map[string]any), &pools)
	if err != nil {
		return nil, nil, err
	}

	// get global config for resource type metadata
	body = map[string]any{}
	res, code, err = common.RequestGetAPI("/global/config/resources", &auth, &body)
	if err != nil {
		return nil, nil, err
	}
	if code != 200 {
		return nil, nil, fmt.Errorf("request to /global/config/resources resulted in %+v", res)
	}
	headers, err := GetAdminResourceHeaders(body["resources"].(map[string]any))
	if err != nil {
		return nil, nil, err
	}

	// fill in the display values of each pool
	for poolname, pool := range pools {
		pool.ClientGroups = []paas.Group{}
		pool.AdminGroups = []paas.Group{}
		for _, group := range pool.Groups {
			if group.IsAdmin == true {
				pool.AdminGroups = append(pool.AdminGroups, group)
			} else {
				pool.ClientGroups = append(pool.ClientGroups, group)
			}
		}
		pool.ResourceCells, err = FormatPoolResourceCells(pool.Resources, headers)
		if err != nil {
			return nil, nil, err
		}
		pools[poolname] = pool
	}

	return pools, headers, nil
}

// get all groups the user is permitted to see, including groups which are not assigned to any pool
func GetAdminGroups(auth paas.Auth) (map[string]AdminGroup, error) {
	groups := map[string]AdminGroup{}

	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/access/groups", &auth, &body)
	if err != nil {
		return nil, err
	}
	if code != 200 {
		return nil, fmt.Errorf("request to /access/groups resulted in %+v", res)
	}
	err = mapstructure.Decode(body["groups"].(map[string]any), &groups)
	if err != nil {
		return nil, err
	}

	return groups, nil
}

func GetAdminUsers(auth paas.Auth) (map[string]UserCard, error) {
	users := map[string]paas.User{}

	body := map[string]any{}
	res, code, err := common.RequestGetAPI("/access/users", &auth, &body)
	if err != nil {
		return nil, err
	}
	if code != 200 {
		return nil, fmt.Errorf("request to /access/users resulted in %+v", res)
	}

	err = mapstructure.Decode(body["users"].(map[string]any), &users)
	if err != nil {
		return nil, err
	}

	userCards := map[string]UserCard{}
	for _, user := range users {
		username := user.Username.ToString()
		userCards[username] = UserCard{
			CN:       user.CN,
			SN:       user.SN,
			Mail:     user.Mail,
			Enable:   true, // todo whether to handle enable/disable users
			Realm:    user.Username.Realm,
			Username: user.Username,
		}
	}

	return userCards, nil
}

// get the displayed numeric and storage resources, ordered the same way as the account page (category then key)
func GetAdminResourceHeaders(meta map[string]any) ([]AdminResourceHeader, error) {
	headers := []AdminResourceHeader{}
	for k, v := range meta {
		header := AdminResourceHeader{Key: k}
		err := mapstructure.Decode(v, &header)
		if err != nil {
			return nil, err
		}
		if header.Display && (header.Type == "numeric" || header.Type == "storage") {
			headers = append(headers, header)
		}
	}

	slices.SortFunc(headers, func(a, b AdminResourceHeader) int {
		return cmp.Or(cmp.Compare(a.Category, b.Category), cmp.Compare(a.Key, b.Key))
	})

	return headers, nil
}

// get the maximum allowed by the pool for each resource column, resources the pool has no quota for are shown as "-"
func FormatPoolResourceCells(resources map[string]any, headers []AdminResourceHeader) ([]string, error) {
	cells := make([]string, len(headers))
	for i, header := range headers {
		resource, ok := resources[header.Key]
		if !ok {
			cells[i] = "-"
			continue
		}

		quota := struct{ Total paas.Constraint }{}
		err := mapstructure.Decode(resource, &quota)
		if err != nil {
			return nil, err
		}

		max, prefix := paas.FormatNumber(paas.SafeUint64(quota.Total.Max*header.Multiplier), header.Base)
		cells[i] = fmt.Sprintf("%s %s%s", max, prefix, header.Unit)
	}
	return cells, nil
}
