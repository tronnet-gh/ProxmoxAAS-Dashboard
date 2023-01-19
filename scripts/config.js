import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let diskConfig = {
	lxc: {
		prefixOrder: ["mp"],
		mp: {name: "MP", icon: "images/resources/drive.svg"}
	},
	qemu: {
		prefixOrder: ["sata", "ide"],
		ide: {name: "IDE", icon: "images/resources/disk.svg"},
		sata: {name: "SATA", icon: "images/resources/drive.svg"}
	}
}

let node;
let type;
let vmid;

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	let uriData = getURIData();
	node = uriData.node;
	type = uriData.type;
	vmid = uriData.vmid;
	await populateResources();

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});

	console.log(diskConfig);
}

async function populateResources () {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerText = config.data[name];
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "MiB"); // TODO add max from quota API
		let rootfs = config.data.rootfs;
		addDiskLine("disks", "mp", "Root FS", null, rootfs);
	}

	for(let i = 0; i < diskConfig[type].prefixOrder.length; i++){
		let prefix = diskConfig[type].prefixOrder[i];
		let busName = diskConfig[type][prefix].name;
		let disks = {};
		Object.keys(config.data).forEach(element => {
			if (element.startsWith(prefix)) {
				disks[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = getOrderedUsed(disks);
		ordered_keys.forEach(element => {
			let disk = disks[element];
			addDiskLine("disks", prefix, busName, element, disk);
		});
	}
}

function addResourceLine (fieldset, iconHref, labelText, inputAttr, unitText=null) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = iconHref;
	icon.alt = labelText;
	field.append(icon);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	label.htmlFor = labelText;
	field.append(label);

	let input = document.createElement("input");
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	input.id = labelText;
	field.append(input);

	if (unitText) {
		let unit = document.createElement("p");
		unit.innerText = unitText;
		field.append(unit);
	}
}

async function addDiskLine (fieldset, busPrefix, busName, device, disk) {
	let field = document.querySelector(`#${fieldset}`);
	
	// Set the disk icon, either drive.svg or disk.svg
	let icon = document.createElement("img");
	icon.src = diskConfig[type][busPrefix].icon;
	icon.alt = `${busName} ${device}`;
	field.append(icon);

	// Add a label for the disk bus and device number
	let diskLabel = document.createElement("label");
	diskLabel.innerHTML = `${busName} ${device}`;
	field.append(diskLabel);

	// Add text of the disk configuration
	let diskDesc = document.createElement("p");
	diskDesc.innerText = disk;
	field.append(diskDesc);

	let actionDiv = document.createElement("div");
	actionDiv.classList.add("last-item");
	let deleteBtn = document.createElement("img");
	deleteBtn.src = "images/actions/delete.svg";
	deleteBtn.alt = `Delete disk ${busName} ${device}`;
	deleteBtn.classList.add("clickable");
	actionDiv.append(deleteBtn);
	field.append(actionDiv);
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}