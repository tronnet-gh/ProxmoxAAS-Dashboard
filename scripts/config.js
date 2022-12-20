import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let uriData = getURIData();
	let node = uriData.node;
	let type = uriData.type;
	let vmid = uriData.vmid;
	await populateForm(node, type, vmid);
}

async function populateForm (node, type, vmid) {
	let config = request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);
}