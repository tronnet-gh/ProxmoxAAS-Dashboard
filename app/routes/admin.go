package routes

import (
	"cmp"
	"fmt"
	"net/http"
	"proxmoxaas-dashboard/app/common"
	paas "proxmoxaas-dashboard/proxmoxaas-common-lib"
	"slices"
	"strings"

	"github.com/go-viper/mapstructure/v2"
)

type AdminPool struct {
	paas.Pool     `mapstructure:",squash"`
	ClientGroups  string
	AdminGroups   string
	ResourceCells []string // one cell per AdminResourceHeader, in the same order
}

type AdminGroup struct {
	Name    string
	Members string
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

		paas.HTTPExecuteHTMLTemplate(w, common.TMPL, "html/admin.html", map[string]any{
			"global":  common.Global,
			"page":    "admin",
			"pools":   pools,
			"headers": headers,
			"groups":  groups,
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
		pool.ClientGroups = FormatPoolGroups(pool.Groups, false)
		pool.AdminGroups = FormatPoolGroups(pool.Groups, true)
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
	groups := map[string]paas.Group{}

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

	adminGroups := map[string]AdminGroup{}
	for name, group := range groups { // the key is the exact proxmox group id, unlike Groupname.ToString() which appends -pve to groups without a realm
		adminGroups[name] = AdminGroup{Name: name, Members: FormatGroupMembers(group.Users)}
	}
	return adminGroups, nil
}

func FormatGroupMembers(users []paas.User) string {
	names := []string{}
	for _, user := range users {
		names = append(names, user.Username.ToString())
	}
	slices.Sort(names)
	return strings.Join(names, ", ")
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

func FormatPoolGroups(groups []paas.Group, isAdmin bool) string {
	names := []string{}
	for _, group := range groups {
		if group.IsAdmin == isAdmin {
			names = append(names, group.Groupname.ToString())
		}
	}
	slices.Sort(names)
	return strings.Join(slices.Compact(names), ", ")
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
