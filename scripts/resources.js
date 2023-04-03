import {requestPVE, requestAPI} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let resources = await requestAPI("/user/resources");
	document.querySelector("main").innerHTML = buildTable(resources.resources, 1);
}

function buildTable (object, idx) {

	if (object instanceof Object) {
		let table = "";
		if (idx === 1) { // topmost table gets some margin and a border
			table += `<table style="margin-top: 10px; border: 1px solid black;">`;
		}
		else {
			table += `<table>`;
		}
		Object.keys(object).forEach((element) => {
			table += `<tr><td>${element}</td><td>${buildTable(object[element], idx + 1)}</td></tr>`;
		});
		table += "</table>"
		
		return table;
	}
	else {
		return object;
	}
}