import {request, goToPage, deleteAllCookies} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	await populateInstances();

	let instances = document.querySelector("nav #instances");
	instances.addEventListener("click", () => {
		goToPage("index.html");
	});

	let logout = document.querySelector("nav #logout");
	logout.addEventListener("click", () => {
		deleteAllCookies();
		goToPage("login.html");
	});
}

async function populateInstances () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let resources = await request("/cluster/resources", "GET", null);

	let instanceContainer = document.getElementById("instance-container")

	let instances = [];

	resources.data.forEach((element) => {
		if (element.type === "lxc" || element.type === "qemu") {
			let nodeName = element.node;
			let nodeStatus = resources.data.find(item => item.node === nodeName && item.type === "node").status;
			element.node = {name: nodeName, status: nodeStatus};
			instances.push(element);
		}
	});

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	instanceContainer.innerText = "";
	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-article");
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}