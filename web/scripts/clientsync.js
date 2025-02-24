import { getSyncSettings, requestAPI } from "./utils.js";
import { API } from "../vars.js";

export async function setupClientSync (callback) {
	const { scheme, rate } = getSyncSettings();

	if (scheme === "always") {
		callback();
		window.setInterval(callback, rate * 1000);
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
		}, rate * 1000);
	}
	else if (scheme === "interrupt") {
		callback();
		const socket = new WebSocket(`wss://${API.replace("https://", "")}/sync/interrupt`);
		socket.addEventListener("open", (event) => {
			socket.send(`rate ${rate}`);
		});
		socket.addEventListener("message", (event) => {
			const message = event.data.toString();
			if (message === "sync") {
				callback();
			}
			else {
				console.error("clientsync: recieved unexpected message from server, closing socket.");
				socket.close();
			}
		});
	}
	else {
		console.error(`clientsync: unsupported scheme ${scheme} selected.`);
	}
}
