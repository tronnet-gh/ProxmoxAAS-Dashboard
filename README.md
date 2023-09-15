# ProxmoxAAS Dashboard - Proxmox As A Service User Web Interface
ProxmoxAAS Dashboard provides users of a proxmox based compute on demand service a simplified UI which gives users power management, console access, and instance configuration utility. It also allows administrators to set resource quotas for users and allows users to configure instances without administrator priviledges. 

## Features
- Simplified interface for non administrator users
- Instance power management 
- Instance resource configuration
- Instance creation and destruction
- Remote console
- Extended account management

## Prerequisites
- Proxmox VE Cluster (v7.0+)
- Reverse proxy server which can proxy the dashboard and API
	- FQDN
- Web server to host the ProxmoxAAS Dashboard (ie Apache2)

## Notes
The supported setup is to use a reverse proxy to serve both the original Proxmox web interface and ProxmoxAAS Dashboard. It is possible other setups can work. Rather than provide specific steps to duplicate a certain setup, the steps included are intended as a guideline of steps required for proper function in most setups. Consequently, the examples provided are only to highlight key settings and do not represent complete working configurations. The instructions also assume you have your own domain name which will substitute `<FQDN>` in some of the configs. 

## Installation - Dashboard
1. Install Apache2 or another HTTP server onto a container or vm, which will be `Dashboard Host`
2. Clone this repo onto `Dashboard Host`, the default location for web root is `/var/www/html/`
4. Configure Apache2 to serve the app at port 80 by adding the file `dashboard.conf` to `/etc/apache2/sites-avaliable/` with at least the following:
```
<VirtualHost *:80>
	DocumentRoot /var/www/html/ProxmoxAAS-Dashboard/
</VirtualHost>
```
4. Enable the site by running `a2ensite dashboard`

After this step, the Dashboard should be available on the `Dashboard Host` at port `80`

## Configuration - Dashboard
1. In `Dashboard Host`, navigate to this repo's root folder
2. Rename `template.vars.js` to `vars.js` and assign the `API` variable with the value of the API's URL. This will likely be `dashboard.<FQDN>/api`

## Installation - API

To install the API, go to [ProxmoxAAS API](https://github.com/tronnet-gh/ProxmoxAAS-API). This is required for the app to function. The API installation will also have steps for setting up the reverse proxy server.  
