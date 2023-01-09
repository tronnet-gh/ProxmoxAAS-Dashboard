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

	let name = type === "qemu" ? "name" : "hostname";
	addMetaLine("name", "Name", {type: "text", value: config.data[name]});
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "GiB"); // TODO add max from quota API
		addDiskLine("disks", "rootfs", "images/resources/disk.svg", "Root FS", config.data.rootfs);
	}
	else { // qemu
		let i = 0;
		while(Object.hasOwn(config.data, `sata${i}`)){
			addDiskLine("disks", `sata${i}`, "images/resources/disk.svg", `SATA ${i}`, config.data[`sata${i}`]);
			i++;
		}
	}
}

function addMetaLine (fieldset, labelText, inputAttr) {
	let field = document.querySelector(`#${fieldset}`);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	field.append(label);

	let input = document.createElement("input");
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	field.append(input);
}

function addResourceLine (fieldset, iconHref, labelText, inputAttr, unitText=null) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = iconHref;
	field.append(icon);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	field.append(label);

	let input = document.createElement("input");
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	field.append(input);

	if (unitText) {
		let unit = document.createElement("p");
		unit.innerText = unitText;
		field.append(unit);
	}
}

function addDiskLine (fieldset, id, iconHref, labelText, valueText) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = iconHref;
	field.append(icon);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	field.append(label);

	let value = document.createElement("p");
	value.innerText = valueText;
	field.append(value);
}