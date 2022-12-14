import {requestTicket, setTicket, request} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if (cookie === '') {
		window.location.href = "login.html";
	}

	let nodes = await request("/nodes", "GET", null);
	let instances = [];

	let instanceContainer = document.getElementById("instance-container")

	for (let i = 0; i < nodes.data.length; i++) {		
		let qemu = await request(`/nodes/${nodes.data[i].node}/qemu`, "GET");
		instances.concat(qemu.data);
		let lxc = await request(`/nodes/${nodes.data[i].node}/lxc`, "GET");
		instances.concat(lxc.data);
	}

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-article");
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}