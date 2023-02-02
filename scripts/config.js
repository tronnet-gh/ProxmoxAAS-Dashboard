import {requestPVE, requestAPI, goToPage, getURIData, reload, resources} from "./utils.js";
import { Dialog } from "./elements.js";

setInterval(async () => {
	await getConfig();
	populateDisk();
}, 1000);

window.addEventListener("DOMContentLoaded", init); // do the dumb thing where the disk config refreshes every second

let diskMetaData = resources.disk;

let node;
let type;
let vmid;
let config;

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	let uriData = getURIData();
	node = uriData.node;
	type = uriData.type;
	vmid = uriData.vmid;

	await getConfig();

	populateResources();
	populateDisk();

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});
}

async function getConfig () {
	config = await requestPVE(`/nodes/${node}/${type}/${vmid}/config`, "GET");
}

function populateResources () {
	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerText = config.data[name];
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "MiB"); // TODO add max from quota API
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

function populateDisk () {
	document.querySelector("#disks").innerHTML = "";
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

function addDiskLine (fieldset, busPrefix, busName, device, disk) {
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
		if (element === "delete_detach_attach" && diskMetaData[type][busPrefix].actions.includes("attach")){ // attach
			action.src = "images/actions/attach.svg";
			action.title = "Attach Disk";
		}
		else if (element === "delete_detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")){ // detach
			action.src = "images/actions/detach.svg";
			action.title = "Detach Disk";
			action.addEventListener("click", handleDiskDetach);
		}
		else if (element === "delete_detach_attach"){
			let active = diskMetaData[type][busPrefix].actions.includes("delete") ? "active" : "inactive"; // delete
			action.src = `images/actions/delete-${active}.svg`;
			action.title = `Delete Disk`;
		}
		else {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/${element}-${active}.svg`;
			action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
			if (element === "config") {

			}
			else if (element === "move") {
				action.addEventListener("click", handleDiskMove);
			}
			else if (element === "resize") {
				action.addEventListener("click", handleDiskResize);
			}
			else {

			}
		}
		action.id = `${busPrefix}${device}`
		actionDiv.append(action);
	});
	field.append(actionDiv);
}

async function handleDiskDetach () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Detach ${this.id}`;

	let confirm = document.createElement("p");
	confirm.innerText = "Are you sure you want to detach disk"
	dialog.append(confirm)

	let idtext = document.createElement("p");
	idtext.innerText = this.id;
	dialog.append(idtext);

	dialog.callback = async (result, form) => {
		if(result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({delete: this.id})
			};
			let result = await requestAPI("/disk/detach", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else{
				console.error(result);
			}
		}
		document.querySelector("dialog-form").remove();
	};
	dialog.show();
}

async function handleDiskResize () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Resize ${this.id}`;

	let label = document.createElement("label");
	label.for = "size-increment";
	label.innerText = "Size Increment (GiB)";
	dialog.append(label);

	let input = document.createElement("input");
	input.name = "size-increment";
	input.type = "number";
	input.min = 0;
	input.max = 131072;
	input.value = 0;
	dialog.append(input);

	dialog.callback = async (result, form) => {
		if(result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({disk: this.id, size: `+${form.get("size-increment")}G`})
			}
			let result = await requestAPI("/disk/resize", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else{
				console.error(result);
			}
		}
		document.querySelector("dialog-form").remove();
	};
	dialog.show();
}

async function handleDiskMove () {
	let content = type === "qemu" ? "images" : "rootdir"
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET", null);
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Move ${this.id}`;

	let label = document.createElement("label");
	label.for = "storage-select";
	label.innerText = "Storage";
	dialog.append(label);

	let storageSelect = document.createElement("select");
	storageSelect.name = "storage-select";
	storage.data.forEach((element) => {
		if(element.content.includes(content)){
			storageSelect.add(new Option(element.storage));
		}
	});

	dialog.append(storageSelect);

	dialog.callback = async (result, form) => {
		if(result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({storage: storageSelect.value, disk: this.id})
			}
			let result = await requestAPI("/disk/move", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else{
				console.error(result);
			}
		}
		document.querySelector("dialog-form").remove();
	};

	dialog.show();
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}