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
		let data = null;
		if (contentType.includes("application/json")) {
			data = await response.json();
			data.status = response.status;
		}
		else if (contentType.includes("text/html")) {
			data = { data: await response.text() };
			data.status = response.status;
		}
		else if (contentType.includes("text/plain")) {
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

export function getURIData () {
	const url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
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

export function getThemeSettings () {
	let theme = localStorage.getItem("appearance-theme");
	if (!theme) {
		theme = settingsDefault["appearance-theme"];
		localStorage.setItem("appearance-theme", theme);
	}
	return theme;
}

export function setSyncSettings (scheme, rate) {
	localStorage.setItem("sync-scheme", scheme);
	localStorage.setItem("sync-rate", rate);
}

export function setSearchSettings (criteria) {
	localStorage.setItem("search-criteria", criteria);
}

export function setThemeSettings (theme) {
	localStorage.setItem("appearance-theme", theme);
}

export function setAppearance () {
	const theme = getThemeSettings();
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
