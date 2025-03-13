import { setAppearance, getSyncSettings, getSearchSettings, getThemeSettings, setSyncSettings, setSearchSettings, setThemeSettings } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init () {
	setAppearance();
	const {scheme, rate} = getSyncSettings();
	if (scheme) {
		document.querySelector(`#sync-${scheme}`).checked = true;
	}
	if (rate) {
		document.querySelector("#sync-rate").value = rate;
	}

	const search = getSearchSettings();
	if (search) {
		document.querySelector(`#search-${search}`).checked = true;
	}

	const theme = getThemeSettings();
	if (theme) {
		document.querySelector("#appearance-theme").value = theme;
	}

	document.querySelector("#settings").addEventListener("submit", handleSaveSettings, false);
}

function handleSaveSettings (event) {
	event.preventDefault();
	const form = new FormData(document.querySelector("#settings"));
	setSyncSettings(form.get("sync-scheme"), form.get("sync-rate"));
	setSearchSettings(form.get("search-criteria"));
	setThemeSettings(form.get("appearance-theme"));
	init();
}
