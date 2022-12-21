import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	let uriData = getURIData();
	let node = uriData.node;
	let type = uriData.type;
	let vmid = uriData.vmid;
	await populateForm(node, type, vmid);

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});
}

async function populateForm (node, type, vmid) {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	addFormLine("name", "name", "Name", {type: "text", value: config.data.name});

	addFormLine("resources", "cores", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads");
	addFormLine("resources", "memory", "Memory", {type: "number", value: config.data.memory / 1024, min: 16}, "GiB");

	let i = 0;
	while(Object.hasOwn(config.data, `sata${i}`)){
		let sata = config.data[`sata${i}`];
		sata = `{"${sata.replaceAll(":", '":"').replaceAll("=", '":"').replaceAll(",", '","')}"}`;
		sata = JSON.parse(sata);
		addFormLine("resources", `sata${i}`, `SATA ${i}`, {type: "text", value: sata.size.slice(0, sata.size.length - 1)}, sata.size.includes("G") ? "GiB" : "MiB");
		i++;
	}
}

function addFormLine (fieldset, id, labelValue, inputAttr, unitValue="") {
	let field = document.querySelector(`#${fieldset}`);

	let label = document.createElement("label");
	label.for = id;
	label.innerHTML = labelValue;
	field.append(label);

	let input = document.createElement("input");
	input.id = id;
	input.name = id;
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	field.append(input);

	let unit = document.createElement("p");
	unit.innerText = unitValue;
	field.append(unit)
}