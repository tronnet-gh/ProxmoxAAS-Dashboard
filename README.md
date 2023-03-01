# ProxmoxAAS Client - Proxmox As A Service User Interface
ProxmoxAAS Client provides users of a proxmox based compute on demand service a simplified UI which gives users power management, console access, and instance configuration utility. It also allows administrators to set resource quotas for users and allows users to configure instances without administrator priviledges. 

## Features
- Simplified interface for clients
- Instance power management 
- Instance resource configuration
- Instance creation and destruction
- Remote console using xterm.js
- Basic account management

## Prerequisites
- Proxmox VE Cluster (v7.0+)
- Reverse proxy server which serves the Proxmox VE Web GUI & API (ie nginx)
- Web server to host the ProxmoxAAS Client (ie Apache2)
- [ProxmoxAAS-API](https://github.com/tronnet-gh/ProxmoxAAS-API). Ensure that this is done first.

## Notes
The supported setup is to use a reverse proxy to serve both the original Proxmox web interface and ProxmoxAAS Client. It is possible other setups can work. Rather than provide specific steps to duplicate a certain setup, the steps included are intended as a guideline of steps required for proper function in most setups. 

## Installation - Client
1. Install Apache2 or another HTTP server onto a container or vm, which will be `Client Host`
2. Clone this repo onto `Client Host`, the default location for web root is `/var/www/html/`
3. Navigate to the repo root folder, rename `vars.js.template` to `vars.js` and modify with the following:
	- Assign the url for the Proxmox Web UI to `pveAPI`. This should be at `pve.<FQDN>/api2/json` or similar
	- Assign the url for the Proxmox Client API to `paasAPI`. This should be at `client.<FQDN>/api`
4. Configure Apache2 to serve the Client at port 80:
```
<VirtualHost *:80>
	ServerAdmin webmaster@localhost
	DocumentRoot /var/www/html/ProxmoxClient/
	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```
4. Enable the Client site by running `a2ensite client`

After this step, the Client should be available at `PAAS Client Host` on port `80`

## Installation - Reverse Proxy
1. Configure nginx to reverse proxy the default Proxmox web UI, the example below also includes configuration for SSL.
```
server {
	listen 80;
	server_name pve.<FQDN>;
	rewrite ^(.*) https://$host$1 permanent;
}
 
server {
	listen 443 ssl;
	server_name pve.<FQDN>;
	ssl_certificate <fullchain.pem>;
	ssl_certificate_key <privkey.pem>;
	include /etc/nginx/snippets/ssl-params.conf;
	proxy_redirect off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade"; 
        proxy_pass <Proxmox Host>:8006;
        proxy_buffering off;
        client_max_body_size 0;
        proxy_connect_timeout  3600s;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        send_timeout  3600s;
        }
        	location '/.well-known/acme-challenge' {
        	default_type "text/plain";
        	root /var/www/html;
        }
}
```
2. Configure nginx to reverse proxy the client. This can be done in the same file previously or in a new configuration file. It is a pretty typical nginx config file:
```
server {
    listen 80;
    server_name client.<FQDN>;
    rewrite ^(.*) https://$host$1 permanent;
}
server {
	listen 443 ssl;
	server_name client.<FQDN>;
	ssl_certificate <fullchain.pem>;
	ssl_certificate_key <privkey.pem>;
	include /etc/nginx/snippets/ssl-params.conf;
	proxy_redirect off;
	location / {
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_pass http://<Client Host IP or DN>:80;
		proxy_buffering off;
		client_max_body_size 0;
		proxy_connect_timeout  3600s;
		proxy_read_timeout  3600s;
		proxy_send_timeout  3600s;
		send_timeout  3600s;
	}
	location /api/ {
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_pass http://<Client Host IP or DN>:8080;
		proxy_buffering off;
		client_max_body_size 0;
		proxy_connect_timeout  3600s;
		proxy_read_timeout  3600s;
		proxy_send_timeout  3600s;
		send_timeout  3600s;
	}
	location '/.well-known/acme-challenge' {
		default_type "text/plain";
		root /var/www/html;
	}
}
```
3. Restart nginx with the new configurations by running `systemctl restart nginx`

## Validating & API Installation

The Proxmox web UI will be avaliable at pve.\<FQDN\> and the PAAS Client will be avaliable at client.\<FQDN\>. Login, instance power management, and instance auditing should be avaliable. To add configuration change functionality, go to [ProxmoxAAS API](https://github.com/tronnet-gh/ProxmoxAAS-API).
