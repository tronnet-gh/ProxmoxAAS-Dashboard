import { requestAPI, goToPage, getCookie, setTitleAndHeader } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let prefixes = {
	1024: [
		"",
		"Ki",
		"Mi",
		"Gi",
		"Ti"
	],
	1000: [
		"",
		"K",
		"M",
		"G",
		"T"
	]
}

async function init() {
	setTitleAndHeader();
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	let resources = await requestAPI("/user/resources");
	let instances = await requestAPI("/user/instances");
	let nodes = await requestAPI("/user/nodes");
	document.querySelector("#username").innerText = `Username: ${getCookie("username")}`;
	document.querySelector("#pool").innerText = `Pool: ${instances.pool}`;
	document.querySelector("#vmid").innerText = `VMID Range: ${instances.vmid.min} - ${instances.vmid.max}`;
	document.querySelector("#nodes").innerText = `Nodes: ${nodes.toString()}`;
	buildResourceTable(resources, "#resource-table");
}

function buildResourceTable(resources, tableid) {

	if (resources instanceof Object) {
		let table = document.querySelector(tableid);
		let tbody = table.querySelector("tbody");
		Object.keys(resources.avail).forEach((element) => {
			let row = tbody.insertRow();
			let key = row.insertCell();
			key.innerText = `${element}`;
			let used = row.insertCell();
			used.innerText = `${parseNumber(resources.used[element], resources.units[element])}`;
			let val = row.insertCell();
			val.innerText = `${parseNumber(resources.avail[element], resources.units[element])}`;
			let total = row.insertCell();
			total.innerText = `${parseNumber(resources.max[element], resources.units[element])}`;
		});
	}
}

function parseNumber(value, unitData) {
	let compact = unitData.compact;
	let multiplier = unitData.multiplier;
	let base = unitData.base;
	let unit = unitData.unit;
	value = multiplier * value;
	if (value <= 0) {
		return `0 ${unit}`;
	}
	else if (compact) {
		let exponent = Math.floor(Math.log(value) / Math.log(base));
		value = value / base ** exponent;
		let unitPrefix = prefixes[base][exponent];
		return `${value} ${unitPrefix}${unit}`
	}
	else {
		return `${value} ${unit}`;
	}
}