import {requestAPI, goToPage, getCookie, setTitleAndHeader} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let SIPrefix = [
	"",
	"Ki",
	"Mi",
	"Gi",
	"Ti"
]

async function init () {
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

function buildResourceTable (resources, tableid) {

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
	let unit = unitData.unit;
	value = multiplier * value;
	if (value <= 0) {
		return `0 ${unit}`;
	}
	else if (compact) {
		let exponent = Math.floor(Math.log2(value) / 10);
		value = value / 1024 ** exponent;
		let unitPrefix = SIPrefix[exponent];
		return `${value} ${unitPrefix}${unit}`
	}
	else {
		return `${value} ${unit}`;
	}
}