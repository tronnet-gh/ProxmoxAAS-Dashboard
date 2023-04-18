import {requestPVE, requestAPI} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let resources = await requestAPI("/user/resources");
	buildResourceTable(resources, "#resource-table");
}

function buildResourceTable (object, tableid) {

	if (object instanceof Object) {

		let table = document.querySelector(tableid);
		let tbody = table.querySelector("tbody");
		Object.keys(object.available).forEach((element) => {
			let row = tbody.insertRow();
			let key = row.insertCell();
			key.innerText = `${element}`;
			let used = row.insertCell();
			used.innerText = `${object.used[element]}`;
			let val = row.insertCell();
			val.innerText = `${object.available[element]}`;
			let total = row.insertCell();
			total.innerText = `${object.maximum[element]}`;
		});
	}
}