import {requestAPI, goToPage, getCookie} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let SIPrefix = [
	"",
	"Ki",
	"Mi",
	"Gi",
	"Ti"
]

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let user = await requestAPI("/user");
	let resources = user.resources;
	let instances = user.instances;
	document.querySelector("#username").innerHTML += getCookie("username");
	document.querySelector("#pool").innerHTML += instances.pool;
	document.querySelector("#vmid").innerHTML += `[${instances.vmid.min},${instances.vmid.max}]`;
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
	if (compact) {
		let exponent = Math.floor(Math.log2(value) / 10);
		value = value / 1024 ** exponent;
		let unitPrefix = SIPrefix[exponent];
		return `${value} ${unitPrefix}${unit}`
	}
	else {
		return `${value} ${unit}`;
	}
}