import {requestTicket, setTicket, request} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	await populateInstances();
	//setInterval(populateInstances, 1000);
}

async function populateInstances () {
	let cookie = document.cookie;
	if (cookie === "") {
		window.location.href = "login.html";
	}

	let nodes = await request("/nodes", "GET", null);
	let instances = [];

	let instanceContainer = document.getElementById("instance-container")

	for (let i = 0; i < nodes.data.length; i++) {	
		let nodeName = nodes.data[i].node;
		let nodeStatus = nodes.data[i].status;

		let qemu = await request(`/nodes/${nodeName}/qemu`, "GET");
		qemu.data.forEach((item) => {
			item.node = {name: nodeName, status: nodeStatus}; 
			item.maxswap = 0;
			item.type = "qemu";
		});
		let lxc = await request(`/nodes/${nodeName}/lxc`, "GET");
		lxc.data.forEach((item) => {
			item.node = {name: nodeName, status: nodeStatus};
			item.type = "lxc";
		});
		instances = instances.concat(qemu.data, lxc.data);
	}

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	instanceContainer.innerText = "";
	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-article");
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}