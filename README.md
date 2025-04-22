# ProxmoxAAS Dashboard - Proxmox As A Service User Web Interface
ProxmoxAAS Dashboard provides users of a proxmox based compute on demand service a simplified UI which gives users power management, console access, and instance configuration utility. It also allows administrators to set resource quotas for users and allows users to configure instances without administrator priviledges. 

## Features
- Simplified interface for non administrator users
- Instance power management 
- Instance resource configuration
- Instance creation and destruction
- Remote console
- Extended account management

# Installation

## ProxmoxAAS System Installation Overview

The ProxmoxAAS project is large and is split into multiple components. There are three required components, the Dashboard, API, and Fabric. There is also an optional LDAP component for organizations that want to use LDAP as their authentication backend. The instalation order should start with the Dashboard and then proceed to the other backend components. This will require some foresight into the setup process.

The supported setup is to use a reverse proxy to serve both the original Proxmox web interface and ProxmoxAAS components. It is possible other setups can work. Rather than provide specific steps to duplicate a certain setup, the steps included are intended as a guideline of steps required for proper function in most setups. Consequently, the examples provided are only to highlight key settings and do not represent complete working configurations. The instructions also assume you have your own domain name which will substitute `domain.net` in some of the configs. 

We will assume different hosts for each component which are accessible by unique host names and public URL addresses. Below is a table of references in the setup instructions across all components. You will need to substitute real addresses and hostnames for these in configurations.

| component | internal address | external address | 
| --- | --- | --- |
| Proxmox VE API | pve.local | pve.domain.net |
| ProxmoxAAS-Dashboard | dashboard.local | paas.domain.net |
| ProxmoxAAS-API | api.local | paas.domain.net/api/ |
| ProxmoxAAS-Fabric | fabric.local | N/A |
| ProxmoxAAS-LDAP | ldap.local | N/A|

## Prerequisites - Dashboard
- Proxmox VE Cluster (v7.0+)
- Reverse proxy server which can proxy the dashboard, API, and Fabric
	- FQDN

## Installation - Dashboard
1. Initialize any host, which will be the `ProxmoxAAS-Dashboard` component host
2. Download `proxmoxaas-dashboard` binary and `template.config.json` file from [releases](https://git.tronnet.net/tronnet/ProxmoxAAS-LDAP/releases)
Rename `template.config.json` to `config.json` and modify:
    - listenPort: port for PAAS-Dashboard to bind and listen on
	- organization: name of your org which is displayed on the top left corner
	- dashurl: url for the dashboard, ie. `https://paas.domain.net`
	- apiurl: url for PAAS-API, ie. `https://paas.domain.net/api`
	- pveurl: url for the Proxmox endpoint, ie. `https://pve.domain.net`
3. Execute the binary or additionally download `proxmoxaas-dashboard.service` from [releases](https://git.tronnet.net/tronnet/ProxmoxAAS-LDAP/releases) to run using systemd

After this step, the Dashboard should be available on the `ProxmoxAAS-Dashboard` host at the configured `listenPort`

## Installation - API

To install the API component, go to [ProxmoxAAS-API](https://git.tronnet.net/tronnet/ProxmoxAAS-API). This is required for the app to function. The API installation will also have steps for setting up the reverse proxy server. 

## Installation - Fabric

To install the Fabric component, go to [ProxmoxAAS-Fabric](https://git.tronnet.net/tronnet/ProxmoxAAS-Fabric). This is required for the app to function. The Fabric installation will also have steps for setting up the reverse proxy server. 

## Installation - LDAP

To install the LDAP component, go to [ProxmoxAAS-LDAP](https://git.tronnet.net/tronnet/ProxmoxAAS-LDAP).This is an optional component which adds a lightweight REST API server ontop of a simplified LDAP environment. It is only used by the API as a potential authentication backend. 

## Installation - Reverse Proxy
1. Configure nginx or preferred reverse proxy to reverse proxy the dashboard. The configuration should include at least the following, ensuring that the configured ports are adjusted appropriately:
```
server {
	listen 443 ssl;
	server_name paas.domain.net;
	location / {
		proxy_pass http://dashboard.local:8080/;
		proxy_redirect default;
	}
	location /api/ {
		proxy_pass http://api.local:8081/api/;
		proxy_redirect default;
	}
}
```
2. Start nginx with the new configurations

The dashboard, API, and Fabric should be avaliable and fully functional. 