import {requestPVE, requestAPI} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let SIPrefix = [
	"",
	"Ki",
	"Mi",
	"Gi",
	"Ti"
]

async function init () {
	let resources = await requestAPI("/user/resources");
	buildResourceTable(resources, "#resource-table");
}

function buildResourceTable (object, tableid) {

	if (object instanceof Object) {
		let table = document.querySelector(tableid);
		let tbody = table.querySelector("tbody");
		Object.keys(object.avail).forEach((element) => {
			let row = tbody.insertRow();
			let key = row.insertCell();
			key.innerText = `${element}`;
			let used = row.insertCell();
			used.innerText = `${parseNumber(object.used[element], object.units[element])}`;
			let val = row.insertCell();
			val.innerText = `${parseNumber(object.avail[element], object.units[element])}`;
			let total = row.insertCell();
			total.innerText = `${parseNumber(object.max[element], object.units[element])}`;
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
		return value;
	}
}