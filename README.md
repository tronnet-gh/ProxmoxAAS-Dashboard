# ProxmoxAAS Client - Proxmox As A Service User Interface
ProxmoxAAS Client provides users of a proxmox based compute on demand service a simplified UI which gives users power management, console access, and instance configuration utility. It also allows administrators to set resource quotas for users and allows users to configure instances without administrator priviledges. 

## Features
- Simplified interface for clients
- Instance power management 
- Instance resource configuration
- Instance creation and destruction
- Remote console
- Extended account management

## Prerequisites
- Proxmox VE Cluster (v7.0+)
- Reverse proxy server which can proxy the client and API
	- FQDN
- Web server to host the ProxmoxAAS Client (ie Apache2)

## Notes
The supported setup is to use a reverse proxy to serve both the original Proxmox web interface and ProxmoxAAS Client. It is possible other setups can work. Rather than provide specific steps to duplicate a certain setup, the steps included are intended as a guideline of steps required for proper function in most setups. Consequently, the examples provided are only to highlight key settings and do not represent complete working configurations. The instructions also assume you have your own domain name which will substitute `<FQDN>` in some of the configs. 

## Installation - Client
1. Install Apache2 or another HTTP server onto a container or vm, which will be `Client Host`
2. Clone this repo onto `Client Host`, the default location for web root is `/var/www/html/`
4. Configure Apache2 to serve the Client at port 80 by adding the file `client.conf` to `/etc/apache2/sites-avaliable/` with at least the following:
```
<VirtualHost *:80>
	DocumentRoot /var/www/html/ProxmoxAAS-Client/
</VirtualHost>
```
4. Enable the Client site by running `a2ensite client`

After this step, the Client should be available on the `Client Host` at port `80`

## Configuration - Client
1. In `Client Host`, navigate to this repo's root folder
2. Rename `tempalte.vars.js` to `vars.js` and assign the `API` variable with the value of the API's URL. This will likely be `client.<FQDN>/api`


## Installation - API

To install the API, go to [ProxmoxAAS API](https://github.com/tronnet-gh/ProxmoxAAS-API). This is required for the client to function. The API installation will also have steps for setting up the reverse proxy server.  
