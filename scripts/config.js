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

	addFormLine("cores", {innerText: "Cores:"}, {type: "number", value: config.data.cores, min: 1, max: 8192});
	addFormLine("memory", {innerText: "Memory"}, {type: "number", value: config.data.memory, min: 16});
}

function addFormLine (id, labelAttr, inputAttr) {
	let labelWrapperDiv = document.createElement("div");
	let label = document.createElement("label");
	label.for = id;
	for (k in labelAttr) {
		label.k = labelAttr.k;
	}
	labelWrapperDiv.append(label);
	let labelContainer = document.querySelector("#labels");
	labelContainer.append(labelWrapperDiv);

	let inputWrapperDiv = document.createElement("div");
	let input = document.createElement("input");
	input.id = id;
	input.name = id;
	for (k in inputAttr) {
		input.k = inputAttr.k;
	}
	inputWrapperDiv.append(input);
	let inputContainer = document.querySelector("#inputs");
	inputContainer.append(inputWrapperDiv);
}