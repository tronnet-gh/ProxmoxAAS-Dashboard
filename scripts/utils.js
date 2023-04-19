import {API} from "/vars.js";

export class NetworkError extends Error {
	constructor(message) {
		super(message);
		this.name = "NetworkError";
	}
}

export const resources = {
	disk: {
		actionBarOrder: ["move", "resize", "detach_attach", "delete"],
		lxc: {
			prefixOrder: ["rootfs", "mp", "unused"],
			rootfs: {name: "ROOTFS", icon: "images/resources/drive.svg", actions: ["move", "resize"]},
			mp: {name: "MP", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		},
		qemu: {
			prefixOrder: ["ide", "sata", "unused"],
			ide: {name: "IDE", icon: "images/resources/disk.svg", actions: ["delete"]},
			sata: {name: "SATA", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		}
	}
}

export const instances = {
	running: {
		statusSrc: "images/status/active.svg",
		statusAlt: "Instance is running",
		powerButtonSrc: "images/actions/instance/stop.svg",
		powerButtonAlt: "Shutdown Instance",
		configButtonSrc: "images/actions/instance/config-inactive.svg",
		configButtonAlt: "Change Configuration (Inactive)",
		consoleButtonSrc: "images/actions/instance/console-active.svg",
		consoleButtonAlt: "Open Console",
		deleteButtonSrc: "images/actions/delete-inactive.svg",
		deleteButtonAlt: "Delete Instance (Inactive)"
	},
	stopped: {
		statusSrc: "images/status/inactive.svg",
		statusAlt: "Instance is stopped",
		powerButtonSrc: "images/actions/instance/start.svg",
		powerButtonAlt: "Start Instance",
		configButtonSrc: "images/actions/instance/config-active.svg",
		configButtonAlt: "Change Configuration",
		consoleButtonSrc: "images/actions/instance/console-inactive.svg",
		consoleButtonAlt: "Open Console (Inactive)",
		deleteButtonSrc: "images/actions/delete-active.svg",
		deleteButtonAlt: "Delete Instance"
	},
	loading: {
		statusSrc: "images/status/loading.svg",
		statusAlt: "Instance is loading",
		powerButtonSrc: "images/status/loading.svg",
		powerButtonAlt: "Loading Instance",
		configButtonSrc: "images/actions/instance/config-inactive.svg",
		configButtonAlt: "Change Configuration (Inactive)",
		consoleButtonSrc: "images/actions/instance/console-inactive.svg",
		consoleButtonAlt: "Open Console (Inactive)",
		deleteButtonSrc: "images/actions/delete-inactive.svg",
		deleteButtonAlt: "Delete Instance (Inactive)"
	}
}

export const nodes = {
	online: {
		statusSrc: "images/status/active.svg",
		statusAlt: "Node is online",
	},
	offline: {
		statusSrc: "images/status/inactive.svg",
		statusAlt: "Node is offline",
	},
	uknown: {
		statusSrc: "images/status/inactive.svg",
		statusAlt: "Node status is unknown",
	}
}

export function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(";");
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

export async function requestTicket (username, password, realm) {
	let response = await requestPVE("/access/ticket", "POST", {username: `${username}@${realm}`, password: password}, false);
	return response;
}

export function setTicket (ticket, csrf, username) {
	let d = new Date();
	d.setTime(d.getTime() + (2*60*60*1000));
	document.cookie = `PVEAuthCookie=${ticket}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net`;
	document.cookie = `CSRFPreventionToken=${csrf}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net;`
	document.cookie = `username=${username}@ldap; path=/; expires=${d.toUTCString()}; domain=.tronnet.net;`
}

export async function requestPVE (path, method, body = null) {
	let prms = new URLSearchParams(body);
	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}
	if(method === "POST") {
		content.body = prms.toString();
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}

	let response = await request(`${API}/proxmox${path}`, content);
	return response;
}

export async function requestAPI (path, method, body = null) {
	let prms = new URLSearchParams(body);
	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}
	if (method === "POST" || method === "DELETE") {
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}
	if (body) {
		content.body = prms.toString();
	}

	let response = await request(`${API}${path}`, content);
	return response;
}

async function request (url, content) {
	let response = await fetch(url, content)
	.then((response) => {
		return response;
	})
	.catch((error) => {
		return new NetworkError(error);
	});

	if (response instanceof NetworkError) {
		return {status: 408, error: "network error"};
	}
	else if(!response.ok){
		let data = await response.json()
		return {status: response.status, error: data.error};
	}
	else {
		let data = await response.json();
		data.status = response.status;
		return data;
	}
}

export function goToPage (page, data={}, newwindow = false) {
	let url = new URL(`https://${window.location.host}/${page}`);
	for(let k in data) {
		url.searchParams.append(k, data[k]);
	}

	if (newwindow) {
		window.open(url, "tronnet - client", "height=480,width=848");
	}
	else {
		window.location.assign(url.toString());
	}
}

export function goToURL (href, data={}, newwindow = false) {
	let url = new URL(href);
	for(let k in data) {
		url.searchParams.append(k, data[k]);
	}

	if (newwindow) {
		window.open(url, "tronnet - client", "height=480,width=848");
	}
	else {
		window.location.assign(url.toString());
	}
}

export function getURIData () {
	let url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

export function deleteAllCookies () {
	document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.tronnet.net;"); });
}

export function reload () {
	window.location.reload();
}