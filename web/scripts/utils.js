export function setCookie (cname, cval) {
	document.cookie = `${cname}=${cval}`;
}

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

	const response = await request(`${window.API}/proxmox${path}`, content);
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

	const response = await request(`${window.API}${path}`, content);
	return response;
}

export async function requestDash (path, method, body = null) {
	const prms = new URLSearchParams(body);
	const content = {
		method,
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	};
	content.headers.CSRFPreventionToken = getCookie("CSRFPreventionToken");
	if (body) {
		content.body = prms.toString();
	}

	const response = await request(`${window.DASH}${path}`, content);
	return response;
}

async function request (url, content) {
	try {
		const response = await fetch(url, content);
		const contentType = response.headers.get("Content-Type");
		const res = {};

		if (contentType === null) {
			res.data = null;
			res.status = response.status;
		}
		else if (contentType.includes("application/json")) {
			res.data = await response.json();
			res.status = response.status;
		}
		else if (contentType.includes("text/html")) {
			res.data = await response.text();
			res.status = response.status;
		}
		else if (contentType.includes("text/plain")) {
			res.data = await response.text();
			res.status = response.status;
		}
		else {
			res.data = null;
			res.status = response.status;
		}
		
		if (!response.ok) {
			return { status: response.status, error: res.data ? res.data.error : response.status };
		}
		else {
			return res;
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

export function getURIData () {
	const url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

const settings = {
	"sync-scheme": {"type": String, "default": "always"},
	"sync-rate": {"type": Number, "default": 5},
	"search-criteria": {"type": String, "default": "fuzzy"},
	"appearance-theme": {"type": String, "default": "auto"}
};

export function getSetting (key) {
	const meta = settings[key];
	let value = localStorage.getItem(key);
	if (value === null || meta === null) {
		value = meta.default;
		localStorage.setItem(key, meta.default);
	}

	return meta.type(value);
}

export function setSetting (key, value) {
	localStorage.setItem(key, value);
}

export function setAppearance () {
	const theme = getSetting("appearance-theme");
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

export function setIconSrc (icon, path) {
	icon.setAttribute("src", path);
}

export function setIconAlt (icon, alt) {
	icon.setAttribute("alt", alt);
}
