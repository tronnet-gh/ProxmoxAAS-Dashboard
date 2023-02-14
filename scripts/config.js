import {requestPVE, requestAPI, goToPage, getURIData, reload, resources} from "./utils.js";
import { Dialog } from "./elements.js";

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

function addDiskLine (fieldset, busPrefix, busName, device, diskDetails) {
	let field = document.querySelector(`#${fieldset}`);

	let diskName = `${busName} ${device}`;
	let diskID = `${busPrefix}${device}`;
	
	// Set the disk icon, either drive.svg or disk.svg
	let icon = document.createElement("img");
	icon.src = diskMetaData[type][busPrefix].icon;
	icon.alt = diskName;
	icon.dataset.disk = diskID;
	field.append(icon);

	// Add a label for the disk bus and device number
	let diskLabel = document.createElement("label");
	diskLabel.innerHTML = diskName;
	diskLabel.dataset.disk = diskID;
	field.append(diskLabel);

	// Add text of the disk configuration
	let diskDesc = document.createElement("p");
	diskDesc.innerText = diskDetails;
	diskDesc.dataset.disk = diskID;
	field.append(diskDesc);

	let actionDiv = document.createElement("div");
	actionDiv.classList.add("last-item");
	diskMetaData.actionBarOrder.forEach((element) => {
		let action = document.createElement("img");
		action.classList.add("clickable");
		if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("attach")){ // attach
			action.src = "images/actions/attach.svg";
			action.title = "Attach Disk";
			action.addEventListener("click", handleDiskAttach);
		}
		else if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")){ // detach
			action.src = "images/actions/detach.svg";
			action.title = "Detach Disk";
			action.addEventListener("click", handleDiskDetach);
		}
		else {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/${element}-${active}.svg`;
			action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
			if (active === "active") {
				if (element === "move") {
					action.addEventListener("click", handleDiskMove);
				}
				else if (element === "resize") {
					action.addEventListener("click", handleDiskResize);
				}
				else if (element === "delete") {
					action.addEventListener("click", handleDiskDelete);
				}
			}
		}
		action.dataset.disk = diskID;
		action.alt = action.title;
		actionDiv.append(action);
	});
	field.append(actionDiv);
}

async function handleDiskDetach () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Detach ${this.dataset.disk}`;

	let confirm = document.createElement("p");
	confirm.innerText = "Are you sure you want to detach disk"
	dialog.append(confirm)

	let idtext = document.createElement("p");
	idtext.innerText = this.dataset.disk;
	dialog.append(idtext);

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({delete: this.dataset.disk})
			};
			let result = await requestAPI("/disk/detach", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				console.error(result);
			}
		}
	};
	dialog.show();
}

async function handleDiskAttach () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	let diskImage = config.data[this.dataset.disk];

	dialog.header = `Attach ${diskImage}`;

	let label = document.createElement("label");
	label.for = "device";
	label.innerText = type === "qemu" ? "SATA" : "MP";
	dialog.append(label);

	let input = document.createElement("input");
	input.name = "device";
	input.id = "device";
	input.type = "number";
	input.min = 0;
	input.max = 5;
	input.value = 0;
	dialog.append(input);

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let action = {};
			let bus = type === "qemu" ? "sata" : "mp";
			let details = diskImage;
			if (type === "lxc") {
				details += `,mp=/mp${input.value}/`;
			}
			action[`${bus}${input.value}`] = details;			
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify(action)
			}
			let result = await requestAPI("/disk/attach", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				console.error(result);
			}
		}
	};
	dialog.show();
}

async function handleDiskResize () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Resize ${this.dataset.disk}`;

	let label = document.createElement("label");
	label.for = "size-increment";
	label.innerText = "Size Increment (GiB)";
	dialog.append(label);

	let input = document.createElement("input");
	input.name = "size-increment";
	input.id = "size-increment";
	input.type = "number";
	input.min = 0;
	input.max = 131072;
	input.value = 0;
	dialog.append(input);

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({disk: this.dataset.disk, size: `+${form.get("size-increment")}G`})
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
	};
	dialog.show();
}

async function handleDiskMove () {
	let content = type === "qemu" ? "images" : "rootdir"
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET", null);
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Move ${this.dataset.disk}`;

	let storageLabel = document.createElement("label");
	storageLabel.for = "storage-select";
	storageLabel.innerText = "Storage";
	dialog.append(storageLabel);

	let storageSelect = document.createElement("select");
	storageSelect.name = "storage-select";
	storageSelect.id = "storage-select";
	storage.data.forEach((element) => {
		if (element.content.includes(content)){
			storageSelect.add(new Option(element.storage));
		}
	});

	dialog.append(storageSelect);

	let deleteLabel = document.createElement("label");
	deleteLabel.for = "delete-check";
	deleteLabel.innerText = "Delete Source";
	dialog.append(deleteLabel);

	let deleteCheckbox = document.createElement("input");
	deleteCheckbox.type = "checkbox";
	deleteCheckbox.name = "delete-check"
	deleteCheckbox.id = "delete-check"
	deleteCheckbox.checked = true;
	dialog.append(deleteCheckbox);

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let action = {storage: storageSelect.value, delete: deleteCheckbox.checked ? "1": "0"}
			if (type === "qemu") { // if vm, move disk
				action.disk = this.dataset.disk;
			}
			else { // type is lxc, move volume
				action.volume = this.dataset.disk;
			}
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify(action)
			}
			let result = await requestAPI("/disk/move", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				console.error(result);
			}
		}
	};

	dialog.show();
}

async function handleDiskDelete () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);

	dialog.header = `Delete ${this.dataset.disk}`;

	let confirm = document.createElement("p");
	confirm.innerHTML = "Are you sure you want to <strong>delete</strong> disk"
	confirm.style.color = "#FF0000";
	dialog.append(confirm)

	let idtext = document.createElement("p");
	idtext.innerText = this.dataset.disk;
	idtext.style.color = "#FF0000";
	dialog.append(idtext);

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify({delete: this.dataset.disk})
			};
			let result = await requestAPI("/disk/delete", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				console.error(result);
			}
		}
	};
	dialog.show();
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}