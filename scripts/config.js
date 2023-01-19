import {requestPVE, goToPage, getURIData, reload, resources} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let diskMetaData = resources.disk;

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

	console.log(diskMetaData);
}

async function populateResources () {
	let config = await requestPVE(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerText = config.data[name];
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "MiB"); // TODO add max from quota API
	}

	for(let i = 0; i < diskMetaData[type].prefixOrder.length; i++){
		let prefix = diskMetaData[type].prefixOrder[i];
		let busName = diskMetaData[type][prefix].name;
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
	icon.src = diskMetaData[type][busPrefix].icon;
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
	diskMetaData.actionBarOrder.forEach((element) => {
		let action = document.createElement("img");
		action.classList.add("clickable");
		if (element === "delete_detach_attach" && diskMetaData[type][busPrefix].actions.includes("attach")){
			action.src = "images/actions/attach.svg";
			action.title = "Attach Disk";
		}
		else if (element === "delete_detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")){
			action.src = "images/actions/detach.svg";
			action.title = "Detach Disk";
		}
		else if (element === "delete_detach_attach"){
			let active = diskMetaData[type][busPrefix].actions.includes("delete") ? "active" : "inactive";
			action.src = `images/actions/delete-${active}.svg`;
			action.title = `Delete Disk`;
		}
		else {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive";
			action.src = `images/actions/${element}-${active}.svg`;
			action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
		}
		action.id = `${busPrefix}${device}`
		actionDiv.append(action);
	});
	field.append(actionDiv);
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}