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
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	addFormLine("cores", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192});
	addFormLine("memory", "Memory", {type: "number", value: config.data.memory, min: 16});
}

function addFormLine (id, labelName, inputAttr) {
	let form = document.querySelector("#user-configurable");

	let label = document.createElement("label");
	label.for = id;
	label.innerHTML = labelName;
	form.append(label);

	let input = document.createElement("input");
	input.id = id;
	input.name = id;
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	form.append(input);
}