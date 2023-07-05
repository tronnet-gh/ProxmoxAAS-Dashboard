import { requestAPI, goToPage, getCookie, setTitleAndHeader } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

const prefixes = {
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
};

async function init () {
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	const resources = await requestAPI("/user/dynamic/resources");
	const instances = await requestAPI("/user/config/cluster");
	const nodes = await requestAPI("/user/config/nodes");
	document.querySelector("#username").innerText = `Username: ${getCookie("username")}`;
	document.querySelector("#pool").innerText = `Pool: ${instances.pool}`;
	document.querySelector("#vmid").innerText = `VMID Range: ${instances.vmid.min} - ${instances.vmid.max}`;
	document.querySelector("#nodes").innerText = `Nodes: ${nodes.toString()}`;
	buildResourceTable(resources, "#resource-table");
}

function buildResourceTable (resources, tableid) {
	if (resources instanceof Object) {
		const table = document.querySelector(tableid);
		const tbody = table.querySelector("tbody");
		Object.keys(resources.resources).forEach((element) => {
			if (resources.resources[element].display) {
				if (resources.resources[element].type === "list") {
				}
				else {
					const row = tbody.insertRow();
					const key = row.insertCell();
					key.innerText = `${element}`;
					const used = row.insertCell();
					used.innerText = `${parseNumber(resources.used[element], resources.resources[element])}`;
					const val = row.insertCell();
					val.innerText = `${parseNumber(resources.avail[element], resources.resources[element])}`;
					const total = row.insertCell();
					total.innerText = `${parseNumber(resources.max[element], resources.resources[element])}`;
				}
			}
		});
	}
}

function parseNumber (value, unitData) {
	const compact = unitData.compact;
	const multiplier = unitData.multiplier;
	const base = unitData.base;
	const unit = unitData.unit;
	value = multiplier * value;
	if (value <= 0) {
		return `0 ${unit}`;
	}
	else if (compact) {
		const exponent = Math.floor(Math.log(value) / Math.log(base));
		value = value / base ** exponent;
		const unitPrefix = prefixes[base][exponent];
		return `${value} ${unitPrefix}${unit}`;
	}
	else {
		return `${value} ${unit}`;
	}
}
