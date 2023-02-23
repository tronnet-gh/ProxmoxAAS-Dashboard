import {requestPVE, requestAPI, goToPage, getURIData, resources} from "./utils.js";
import { Dialog } from "./dialog.js";

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

	document.querySelector("#exit").addEventListener("click", handleFormExit);
}

async function getConfig () {
	config = await requestPVE(`/nodes/${node}/${type}/${vmid}/config`, "GET");
	console.log(config);
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
	input.name = labelText;
	input.required = true;
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
	document.querySelector("#disk-add").addEventListener("click", handleDiskAdd);

	if (type === "qemu") {
		document.querySelector("#cd-add").classList.remove("none");
		document.querySelector("#cd-add").addEventListener("click", handleCDAdd);
	}
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
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
			action.src = "images/actions/disk/attach.svg";
			action.title = "Attach Disk";
			action.addEventListener("click", handleDiskAttach);
		}
		else if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")){ // detach
			action.src = "images/actions/disk/detach.svg";
			action.title = "Detach Disk";
			action.addEventListener("click", handleDiskDetach);
		}
		else if (element === "delete") {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/delete-${active}.svg`;
			action.title = "Delete Disk";
			action.addEventListener("click", handleDiskDelete);
		}
		else {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/disk/${element}-${active}.svg`;
			action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
			if (active === "active") {
				if (element === "move") {
					action.addEventListener("click", handleDiskMove);
				}
				else if (element === "resize") {
					action.addEventListener("click", handleDiskResize);
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
	dialog.formBody = `<p>Are you sure you want to detach disk</p><p>${this.dataset.disk}</p>`;

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
	dialog.formBody = `<label for="device">${type === "qemu" ? "SATA" : "MP"}</label><input name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" required></input>`;

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			let device = form.get("device");
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let action = {};
			let bus = type === "qemu" ? "sata" : "mp";
			let details = diskImage;
			if (type === "lxc") {
				details += `,mp=/mp${device}/`;
			}
			action[`${bus}${device}`] = details;			
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
	dialog.formBody = `<label for="size-increment">Size Increment (GiB)</label><input name="size-increment" id="size-increment" type="number" min="0" max="131072"></input>`;

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

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)){
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let select = `<label for="storage-select">Storage</label><select name="storage-select" id="storage-select">${options}</select>`;

	dialog.formBody = `
		${select}
		<label for="delete-check">Delete Source</label><input name="delete-check" id="delete-check" type="checkbox" checked required>
	`;

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/actions/loading.svg";
			let action = {storage: form.get("storage-select"), delete: form.get("delete-check") === "on" ? "1": "0"}
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
	dialog.formBody = `<p style="color: #FF0000;">Are you sure you want to <strong>delete</strong> disk</p><p style="color: #FF0000;">${this.dataset.disk}</p>`;

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

async function handleDiskAdd () {
	let content = type === "qemu" ? "images" : "rootdir"
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET", null);
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);
	
	dialog.header = "Create New Disk";

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)){
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let select = `<label for="storage-select">Storage</label><select name="storage-select" id="storage-select" required>${options}</select>`;

	dialog.formBody = `
		<label for="device">${type === "qemu" ? "SATA" : "MP"}</label><input name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" value="0" required></input>
		${select}
		<label for="size">Size (GiB)</label><input name="size" id="size" type="number" min="0" max="131072" required></input>
	`;

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			let device = form.get("device");
			let storage = form.get("storage-select");
			let size = form.get("size");

			let action = {};

			if (type === "qemu") { // type is qemu, use sata
				action[`sata${device}`] = `${storage}:${size}`;
			}
			else { // type is lxc, use mp and add mp and backup values
				action[`mp${device}`] = `${storage}:${size},mp=/mp${device}/,backup=1`;
			}

			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify(action)
			};
			let result = await requestAPI("/disk/create", "POST", body);
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

async function handleCDAdd () {
	let content = "iso";
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET", null);
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);
	
	dialog.header = `Add a CDROM`;

	let storageOptions = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)){
			storageOptions += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let storageSelect = `<label for="storage-select">Storage</label><select name="storage-select" id="storage-select" required>${storageOptions}</select>`;

	dialog.formBody = `
		<label for="device">IDE</label><input name="device" id="device" type="number" min="0" max="3" required></input>
		${storageSelect}
		<label for="iso-select">Image</label><select name="iso-select" id="iso-select" required></select>
	`;

	dialog.shadowRoot.querySelector("#storage-select").selectedIndex = -1;

	dialog.shadowRoot.querySelector("#storage-select").addEventListener("change", async () => {
		let storage = dialog.shadowRoot.querySelector("#storage-select").value;
		let ISOSelect = dialog.shadowRoot.querySelector("#iso-select");
		let isos = await requestPVE(`/nodes/${node}/storage/${storage}/content`, "GET", {content: content});
		isos.data.forEach((element) => {
			if (element.content.includes(content)) {
				ISOSelect.append(new Option(element.volid.replace(`${storage}:${content}/`, ""), element.volid));
			}
		});
	});

	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			let device = form.get("device");
			let iso = form.get("iso-select");

			let action = {};
			action[`ide${device}`] = `${iso},media=cdrom`;

			let body = {
				node: node,
				type: type,
				vmid: vmid,
				action: JSON.stringify(action)
			};
			let result = await requestAPI("/disk/create", "POST", body);
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

async function handleFormExit () {
	let body = {
		node: node,
		type: type,
		vmid: vmid,
		cores: document.querySelector("#Cores").value,
		memory: document.querySelector("#Memory").value
	}
	let result = await requestAPI("/resources", "POST", body);
	if (result.status === 200) {
		await getConfig();
		populateDisk();
	}
	else {
		console.error(result);
	}
	goToPage("index.html");
}