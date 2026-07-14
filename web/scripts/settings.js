import { setAppearance, getSetting, setSetting } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init () {
	setAppearance();

	document.querySelectorAll("[id^=sync-]").forEach((v) => {
		v.addEventListener("change", handleSettingsChange);
	});
	document.querySelector(`#sync-${getSetting("sync-scheme")}`).checked = true;
	document.querySelector("#sync-rate").value = getSetting("sync-rate");

	document.querySelectorAll("[id^=search-]").forEach((v) => {
		v.addEventListener("change", handleSettingsChange);
	});
	document.querySelector(`#search-${getSetting("search-criteria")}`).checked = true;

	document.querySelector("#appearance-theme").addEventListener("change", handleSettingsChange);
	document.querySelector("#appearance-theme").value = getSetting("appearance-theme");

	document.querySelector("#settings").addEventListener("submit", handleSaveSettings, false);
}

function handleSettingsChange (event) {
	event.preventDefault();
	const form = new FormData(document.querySelector("#settings"));
	const saveBtn = document.querySelector("#save");
	if (getSetting("sync-scheme") !== form.get("sync-scheme")) {
		saveBtn.classList.remove("disabled");
		saveBtn.classList.add("enabled");
	}
	else if (getSetting("sync-rate") !== Number(form.get("sync-rate"))) {
		saveBtn.classList.remove("disabled");
		saveBtn.classList.add("enabled");
	}
	else if (getSetting("search-criteria") !== form.get("search-criteria")) {
		saveBtn.classList.remove("disabled");
		saveBtn.classList.add("enabled");
	}
	else if (getSetting("appearance-theme") !== form.get("appearance-theme")) {
		saveBtn.classList.remove("disabled");
		saveBtn.classList.add("enabled");
	}
	else {
		saveBtn.classList.remove("enabled");
		saveBtn.classList.add("disabled");
	}
}

function handleSaveSettings (event) {
	event.preventDefault();
	const form = new FormData(document.querySelector("#settings"));
	const saveBtn = document.querySelector("#save");
	setSetting("sync-scheme", form.get("sync-scheme"));
	setSetting("sync-rate", Number(form.get("sync-rate")));
	setSetting("search-criteria", form.get("search-criteria"));
	setSetting("appearance-theme", form.get("appearance-theme"));
	saveBtn.classList.remove("enabled");
	saveBtn.classList.add("disabled");
	init();
}
