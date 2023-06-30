import { API, organization } from "../vars.js";

export const resourcesConfig = {
	disk: {
		actionBarOrder: ["move", "resize", "detach_attach", "delete"],
		lxc: {
			prefixOrder: ["rootfs", "mp", "unused"],
			rootfs: { name: "ROOTFS", icon: "images/resources/drive.svg", actions: ["move", "resize"] },
			mp: { name: "MP", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"] },
			unused: { name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"] }
		},
		qemu: {
			prefixOrder: ["ide", "sata", "unused"],
			ide: { name: "IDE", icon: "images/resources/disk.svg", actions: ["delete"] },
			sata: { name: "SATA", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"] },
			unused: { name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"] }
		}
	},
	network: {
		prefix: "net"
	},
	pcie: {
		prefix: "hostpci"
	}
};

export const instancesConfig = {
	running: {
		status: {
			src: "images/status/active.svg",
			alt: "Instance is running",
			clickable: false
		},
		power: {
			src: "images/actions/instance/stop.svg",
			alt: "Shutdown Instance",
			clickable: true
		},
		config: {
			src: "images/actions/instance/config-inactive.svg",
			alt: "Change Configuration (Inactive)",
			clickable: false
		},
		console: {
			src: "images/actions/instance/console-active.svg",
			alt: "Open Console",
			clickable: true
		},
		delete: {
			src: "images/actions/delete-inactive.svg",
			alt: "Delete Instance (Inactive)",
			clickable: false
		}
	},
	stopped: {
		status: {
			src: "images/status/inactive.svg",
			alt: "Instance is stopped",
			clickable: false
		},
		power: {
			src: "images/actions/instance/start.svg",
			alt: "Start Instance",
			clickable: true
		},
		config: {
			src: "images/actions/instance/config-active.svg",
			alt: "Change Configuration",
			clickable: true
		},
		console: {
			src: "images/actions/instance/console-inactive.svg",
			alt: "Open Console (Inactive)",
			clickable: false
		},
		delete: {
			src: "images/actions/delete-active.svg",
			alt: "Delete Instance",
			clickable: true
		}
	},
	loading: {
		status: {
			src: "images/status/loading.svg",
			alt: "Instance is loading",
			clickable: false
		},
		power: {
			src: "images/status/loading.svg",
			alt: "Loading Instance",
			clickable: false
		},
		config: {
			src: "images/actions/instance/config-inactive.svg",
			alt: "Change Configuration (Inactive)",
			clickable: false
		},
		console: {
			src: "images/actions/instance/console-inactive.svg",
			alt: "Open Console (Inactive)",
			clickable: false
		},
		delete: {
			src: "images/actions/delete-inactive.svg",
			alt: "Delete Instance (Inactive)",
			clickable: false
		}
	}
};

export const nodesConfig = {
	online: {
		status: {
			src: "images/status/active.svg",
			alt: "Node is online"
		}
	},
	offline: {
		status: {
			src: "images/status/inactive.svg",
			alt: "Node is offline"
		}
	},
	uknown: {
		status: {
			src: "images/status/inactive.svg",
			alt: "Node is offline"
		}
	}
};

export function getCookie (cname) {
	const name = cname + "=";
	const decodedCookie = decodeURIComponent(document.cookie);
	const ca = decodedCookie.split(";");
	for (let i = 0; i < ca.length; i++) {
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
	const response = await requestAPI("/ticket", "POST", { username: `${username}@${realm}`, password }, false);
	return response;
}

export async function requestPVE (path, method, body = null) {
	const prms = new URLSearchParams(body);
	const content = {
		method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	};
	if (method === "POST") {
		content.body = prms.toString();
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}

	const response = await request(`${API}/proxmox${path}`, content);
	return response;
}

export async function requestAPI (path, method, body = null) {
	const prms = new URLSearchParams(body);
	const content = {
		method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	};
	if (method === "POST" || method === "DELETE") {
		content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	}
	if (body) {
		content.body = prms.toString();
	}

	const response = await request(`${API}${path}`, content);
	return response;
}

async function request (url, content) {
	const response = await fetch(url, content);
	let data = null;
	try {
		data = await response.json();
		data.status = response.status;
	}
	catch {
		data = null;
	}

	if (!response.ok) {
		return { status: response.status, error: data ? data.error : response.status };
	}
	else {
		data.status = response.status;
		return data || response;
	}
}

export function goToPage (page, data = {}, newwindow = false) {
	const url = new URL(`https://${window.location.host}/${page}`);
	for (const k in data) {
		url.searchParams.append(k, data[k]);
	}

	if (newwindow) {
		window.open(url, `${organization} - client`, "height=480,width=848");
	}
	else {
		window.location.assign(url.toString());
	}
}

export function goToURL (href, data = {}, newwindow = false) {
	const url = new URL(href);
	for (const k in data) {
		url.searchParams.append(k, data[k]);
	}

	if (newwindow) {
		window.open(url, `${organization} - client`, "height=480,width=848");
	}
	else {
		window.location.assign(url.toString());
	}
}

export function getURIData () {
	const url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

export async function deleteAllCookies () {
	await requestAPI("/ticket", "DELETE");
}

export function setTitleAndHeader () {
	document.title = `${organization} - client`;
	document.querySelector("h1").innerText = organization;
}
