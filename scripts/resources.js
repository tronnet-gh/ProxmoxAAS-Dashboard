import {requestPVE, requestAPI} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let resources = await requestAPI("/user/resources");
	document.querySelector("main").append(buildResourceTable(resources.resources, "#resource-table"));
}

function buildResourceTable (object, tableid) {

	if (object instanceof Object) {

		let table = document.querySelector(tableid);
		Object.keys(object).forEach((element) => {
			let row = table.insertRow();
			let key = row.insertCell();
			key.innerText = `${element}`;
			let val = row.insertCell();
			val.innerText = `${object[element]}`
			let total = row.insertCell();;
			total.innerText = `${object[element]}`
		});
		return table;
	}
	else {
		return null;
	}
}