import { requestAPI } from "./utils.js";

export async function setupClientSync (scheme, rate, callback) {
	if (scheme === "always") {
		callback();
		window.setInterval(callback, rate);
	}
	else if (scheme === "hash") {
		const newHash = (await requestAPI("/sync/hash")).data;
		localStorage.setItem("sync-current-hash", newHash);
		callback();
		window.setInterval(async () => {
			const newHash = (await requestAPI("/sync/hash")).data;
			if (localStorage.getItem("sync-current-hash") !== newHash) {
				localStorage.setItem("sync-current-hash", newHash);
				callback();
			}
		}, rate);
	}
	else if (scheme === "interrupt") {

	}
	else {

	}
} 