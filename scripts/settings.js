import { setTitleAndHeader } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init () {
	setTitleAndHeader();
	const scheme = localStorage.getItem("sync-scheme");
	if (scheme) {
		document.querySelector(`#sync-${scheme}`).checked = true;
	}
	const rate = localStorage.getItem("sync-rate");
	if (rate) {
		document.querySelector("#sync-rate").value = rate;
	}
	document.querySelector("#settings").addEventListener("submit", handleSaveSettings, false);
}

function handleSaveSettings (event) {
	event.preventDefault();
	const form = new FormData(document.querySelector("#settings"));
	console.log(form.get("sync-scheme"));
	localStorage.setItem("sync-scheme", form.get("sync-scheme"));
	localStorage.setItem("sync-rate", form.get("sync-rate"));
	window.location.reload();
}
