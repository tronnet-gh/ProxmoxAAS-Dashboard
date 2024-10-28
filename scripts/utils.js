import { API, organization } from "../vars.js";

export const resourcesConfig = {
	cpu: {
		name: "CPU Type",
		icon: "images/resources/cpu.svg",
		id: "proctype",
		unitText: null
	},
	cores: {
		name: "CPU Amount",
		icon: "images/resources/cpu.svg",
		id: "cores",
		unitText: "Cores"
	},
	memory: {
		name: "Memory",
		icon: "images/resources/ram.svg",
		id: "ram",
		unitText: "MiB"
	},
	swap: {
		name: "Swap",
		icon: "images/resources/swap.svg",
		id: "swap",
		unitText: "MiB"
	},
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
		},
		actions: {
			attach: {
				src: "images/actions/disk/attach.svg",
				title: "Attach Disk"
			},
			detach: {
				src: "images/actions/disk/detach.svg",
				title: "Detach Disk"
			},
			delete: null
		}
	},
	network: {
		name: "Network",
		icon: "images/resources/network.svg",
		id: "network",
		unitText: "MB/s",
		prefix: "net"
	},
	pci: {
		name: "Devices",
		icon: "images/resources/device.svg",
		id: "devices",
		unitText: null,
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

export const bootConfig = {
	eligiblePrefixes: ["ide", "sata", "net"],
	ide: {
		icon: "images/resources/disk.svg",
		alt: "IDE Bootable Icon"
	},
	sata: {
		icon: "images/resources/drive.svg",
		alt: "SATA Bootable Icon"
	},
	net: {
		icon: "images/resources/network.svg",
		alt: "NET Bootable Icon"
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
	try {
		const response = await fetch(url, content);
		const contentType = response.headers.get("Content-Type");
		let data = null;
		if (contentType.includes("application/json")) {
			data = await response.json();
			data.status = response.status;
		}
		else if (contentType.includes("text/html")) {
			data = { data: await response.text() };
			data.status = response.status;
		}
		else {
			data = response;
		}
		if (!response.ok) {
			return { status: response.status, error: data ? data.error : response.status };
		}
		else {
			data.status = response.status;
			return data || response;
		}
	}
	catch (error) {
		return { status: 400, error };
	}
}

export function goToPage (page, data = null) {
	const params = data ? (new URLSearchParams(data)).toString() : "";
	window.location.href = `${page}${data ? "?" : ""}${params}`;
}

export function goToURL (href, data = {}, newwindow = false) {
	const url = new URL(href);
	for (const k in data) {
		url.searchParams.append(k, data[k]);
	}

	if (newwindow) {
		window.open(url, `${organization} - dashboard`, "height=480,width=848");
	}
	else {
		window.location.assign(url.toString());
	}
}

export function getURIData () {
	const url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

export async function setTitleAndHeader () {
	document.title = `${organization} - dashboard`;
	document.querySelector("h1").innerText = organization;
	if (getCookie("auth") === "1") {
		const userIsAdmin = (await requestAPI("/user/config/cluster")).admin;
		if (userIsAdmin) {
			const adminNavLink = document.querySelector("#navigation #admin-link");
			adminNavLink.href = "admin.html";
			adminNavLink.classList.remove("none");
			adminNavLink.ariaDisabled = false;
		}
	}
}

const settingsDefault = {
	"sync-scheme": "always",
	"sync-rate": 5,
	"search-criteria": "fuzzy",
	"appearance-theme": "auto"
};

export function getSyncSettings () {
	let scheme = localStorage.getItem("sync-scheme");
	let rate = Number(localStorage.getItem("sync-rate"));
	if (!scheme) {
		scheme = settingsDefault["sync-scheme"];
		localStorage.setItem("sync-scheme", scheme);
	}
	if (!rate) {
		rate = settingsDefault["sync-rate"];
		localStorage.setItem("sync-rate", rate);
	}
	return { scheme, rate };
}

export function getSearchSettings () {
	let searchCriteria = localStorage.getItem("search-criteria");
	if (!searchCriteria) {
		searchCriteria = settingsDefault["search-criteria"];
		localStorage.setItem("search-criteria", searchCriteria);
	}
	return searchCriteria;
}

export function setAppearance () {
	let theme = localStorage.getItem("appearance-theme");
	if (!theme) {
		theme = settingsDefault["appearance-theme"];
		localStorage.setItem("appearance-theme", theme);
	}

	if (theme === "auto") {
		document.querySelector(":root").classList.remove("dark-theme", "light-theme");
	}
	else if (theme === "dark") {
		document.querySelector(":root").classList.remove("light-theme");
		document.querySelector(":root").classList.add("dark-theme");
	}
	else if (theme === "light") {
		document.querySelector(":root").classList.add("light-theme");
		document.querySelector(":root").classList.remove("dark-theme");
	}
}

// assumes href is path to svg, and id to grab is #symb
export function setSVGSrc (svgElem, href) {
	let useElem = svgElem.querySelector("use");
	if (!useElem) {
		useElem = document.createElementNS("http://www.w3.org/2000/svg", "use");
	}
	useElem.setAttribute("href", `${href}#symb`);
	svgElem.append(useElem);
}

export function setSVGAlt (svgElem, alt) {
	svgElem.setAttribute("aria-label", alt);
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject (item) {
	return (item && typeof item === "object" && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep (target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			}
			else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}

/**
 * Checks if object or array is empty
 * @param {*} obj
 * @returns
 */
export function isEmpty (obj) {
	if (obj instanceof Array) {
		return obj.length === 0;
	}
	else {
		for (const prop in obj) {
			if (Object.hasOwn(obj, prop)) {
				return false;
			}
		}
		return true;
	}
}

export function addResourceLine (config, field, resourceType, attributesOverride, labelPrefix = null) {
	const resourceConfig = config[resourceType];
	const iconHref = resourceConfig.icon;
	const elementType = resourceConfig.element;
	const labelText = labelPrefix ? `${labelPrefix} ${resourceConfig.name}` : resourceConfig.name;
	const id = resourceConfig.id;
	const unitText = resourceConfig.unitText;
	const attributes = { ...(resourceConfig.attributes), ...(attributesOverride) };

	const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	setSVGSrc(icon, iconHref);
	setSVGAlt(icon, labelText);
	field.append(icon);

	const label = document.createElement("label");
	label.innerText = labelText;
	label.htmlFor = id;
	field.append(label);

	let element;

	if (elementType === "input") {
		element = document.createElement("input");
		for (const k in attributes) {
			element.setAttribute(k, attributes[k]);
		}
		element.id = id;
		element.name = id;
		element.required = true;
		element.classList.add("w3-input");
		element.classList.add("w3-border");
		field.append(element);
	}
	else if (elementType === "select" || elementType === "multi-select") {
		element = document.createElement("select");
		for (const option of attributes.options) {
			element.append(new Option(option));
		}
		element.value = attributes.value;
		element.id = id;
		element.name = id;
		element.required = true;
		element.classList.add("w3-select");
		element.classList.add("w3-border");
		if (elementType === "multi-select") {
			element.setAttribute("multiple", true);
		}
		field.append(element);
	}
	else if (customElements.get(elementType)) {
		element = document.createElement(elementType);
		if (attributes.options) {
			for (const option of attributes.options) {
				element.append(new Option(option));
			}
		}
		element.value = attributes.value;
		element.id = id;
		element.name = id;
		element.required = true;
		field.append(element);
	}

	let unit;

	if (unitText) {
		unit = document.createElement("p");
		unit.innerText = unitText;
		field.append(unit);
	}
	else {
		unit = document.createElement("div");
		unit.classList.add("hidden");
		field.append(unit);
	}

	return { icon, label, element, unit };
}
