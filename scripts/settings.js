import { setTitleAndHeader, setAppearance } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init () {
	setAppearance();
	setTitleAndHeader();
	const scheme = localStorage.getItem("sync-scheme");
	if (scheme) {
		document.querySelector(`#sync-${scheme}`).checked = true;
	}
	const rate = localStorage.getItem("sync-rate");
	if (rate) {
		document.querySelector("#sync-rate").value = rate;
	}
	const search = localStorage.getItem("search-criteria");
	if (search) {
		document.querySelector(`#search-${search}`).checked = true;
	}
	const theme = localStorage.getItem("appearance-theme");
	if (theme) {
		document.querySelector("#appearance-theme").value = theme;
	}
	document.querySelector("#settings").addEventListener("submit", handleSaveSettings, false);
}

function handleSaveSettings (event) {
	event.preventDefault();
	const form = new FormData(document.querySelector("#settings"));
	localStorage.setItem("sync-scheme", form.get("sync-scheme"));
	localStorage.setItem("sync-rate", form.get("sync-rate"));
	localStorage.setItem("search-criteria", form.get("search-criteria"));
	localStorage.setItem("appearance-theme", form.get("appearance-theme"));
	window.location.reload();
}
