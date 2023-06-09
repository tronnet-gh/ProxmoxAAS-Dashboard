import { requestPVE, requestAPI, goToPage, getURIData, resources_config, setTitleAndHeader } from "./utils.js";
import { alert, dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init); // do the dumb thing where the disk config refreshes every second

let diskMetaData = resources_config.disk;
let networkMetaData = resources_config.network;
let pcieMetaData = resources_config.pcie;

let node;
let type;
let vmid;
let config;

async function init() {
	setTitleAndHeader();
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
	populateNetworks();
	populateDevices();

	document.querySelector("#exit").addEventListener("click", handleFormExit);
}

function getOrdered(keys) {
	let ordered_keys = Object.keys(keys).sort((a, b) => { parseInt(a) - parseInt(b) }); // ordered integer list
	return ordered_keys;
}

async function getConfig() {
	config = await requestPVE(`/nodes/${node}/${type}/${vmid}/config`, "GET");
}

function populateResources() {
	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerHTML = document.querySelector("#name").innerHTML.replace("%{vmname}", config.data[name]);
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", { type: "number", value: config.data.cores, min: 1, max: 8192 }, "Threads");
	addResourceLine("resources", "images/resources/ram.svg", "Memory", { type: "number", value: config.data.memory, min: 16, step: 1 }, "MiB");

	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", { type: "number", value: config.data.swap, min: 0, step: 1 }, "MiB");
	}
}

function addResourceLine(fieldset, iconHref, labelText, inputAttr, unitText = null) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = iconHref;
	icon.alt = labelText;
	field.append(icon);

	let label = document.createElement("label");
	label.innerText = labelText;
	label.htmlFor = labelText;
	field.append(label);

	let input = document.createElement("input");
	for (let k in inputAttr) {
		input.setAttribute(k, inputAttr[k])
	}
	input.id = labelText;
	input.name = labelText;
	input.required = true;
	input.classList.add("w3-input");
	input.classList.add("w3-border");
	field.append(input);

	if (unitText) {
		let unit = document.createElement("p");
		unit.innerText = unitText;
		field.append(unit);
	}
}

function populateDisk() {
	document.querySelector("#disks").innerHTML = "";
	for (let i = 0; i < diskMetaData[type].prefixOrder.length; i++) {
		let prefix = diskMetaData[type].prefixOrder[i];
		let busName = diskMetaData[type][prefix].name;
		let disks = {};
		Object.keys(config.data).forEach((element) => {
			if (element.startsWith(prefix)) {
				disks[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = getOrdered(disks);
		ordered_keys.forEach((element) => {
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

function addDiskLine(fieldset, busPrefix, busName, device, diskDetails) {
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
	diskLabel.innerText = diskName;
	diskLabel.dataset.disk = diskID;
	field.append(diskLabel);

	// Add text of the disk configuration
	let diskDesc = document.createElement("p");
	diskDesc.innerText = diskDetails;
	diskDesc.dataset.disk = diskID;
	field.append(diskDesc);

	let actionDiv = document.createElement("div");
	diskMetaData.actionBarOrder.forEach((element) => {
		let action = document.createElement("img");
		action.classList.add("clickable");
		if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("attach")) { // attach
			action.src = "images/actions/disk/attach.svg";
			action.title = "Attach Disk";
			action.addEventListener("click", handleDiskAttach);
		}
		else if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")) { // detach
			action.src = "images/actions/disk/detach.svg";
			action.title = "Detach Disk";
			action.addEventListener("click", handleDiskDetach);
		}
		else if (element === "delete") {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/delete-${active}.svg`;
			action.title = "Delete Disk";
			if (active === "active") {
				action.addEventListener("click", handleDiskDelete);
			}
		}
		else {
			let active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			action.src = `images/actions/disk/${element}-${active}.svg`;
			if (active === "active") {
				action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
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

async function handleDiskDetach() {
	let header = `Detach ${this.dataset.disk}`;
	let body = `<p>Are you sure you want to detach disk</p><p>${this.dataset.disk}</p>`;
	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: this.dataset.disk
			};
			let result = await requestAPI("/instance/disk/detach", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleDiskAttach() {
	let header = `Attach ${this.dataset.disk}`;
	let body = `<label for="device">${type === "qemu" ? "SATA" : "MP"}</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" required></input>`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			let device = form.get("device");
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: `${type === "qemu" ? "sata" : "mp"}${device}`,
				source: this.dataset.disk.replace("unused", "")
			}
			let result = await requestAPI("/instance/disk/attach", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleDiskResize() {
	let header = `Resize ${this.dataset.disk}`;
	let body = `<label for="size-increment">Size Increment (GiB)</label><input class="w3-input w3-border" name="size-increment" id="size-increment" type="number" min="0" max="131072"></input>`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: this.dataset.disk,
				size: form.get("size-increment")
			}
			let result = await requestAPI("/instance/disk/resize", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleDiskMove() {
	let content = type === "qemu" ? "images" : "rootdir";
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET");

	let header = `Move ${this.dataset.disk}`;

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let select = `<label for="storage-select">Storage</label><select class="w3-select w3-border" name="storage-select" id="storage-select"><option hidden disabled selected value></option>${options}</select>`;

	let body = `
		${select}
		<label for="delete-check">Delete Source</label><input class="w3-input w3-border" name="delete-check" id="delete-check" type="checkbox" checked required>
	`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: this.dataset.disk,
				storage: form.get("storage-select"),
				delete: form.get("delete-check") === "on" ? "1" : "0"
			}
			let result = await requestAPI("/instance/disk/move", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleDiskDelete() {
	let header = `Delete ${this.dataset.disk}`;
	let body = `<p>Are you sure you want to <strong>delete</strong> disk</p><p>${this.dataset.disk}</p>`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-disk="${this.dataset.disk}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: this.dataset.disk
			};
			let result = await requestAPI("/instance/disk/delete", "DELETE", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleDiskAdd() {
	let content = type === "qemu" ? "images" : "rootdir";
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET");

	let header = "Create New Disk";

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let select = `<label for="storage-select">Storage</label><select class="w3-select w3-border" name="storage-select" id="storage-select" required><option hidden disabled selected value></option>${options}</select>`;

	let body = `
		<label for="device">${type === "qemu" ? "SATA" : "MP"}</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" value="0" required></input>
		${select}
		<label for="size">Size (GiB)</label><input class="w3-input w3-border" name="size" id="size" type="number" min="0" max="131072" required></input>
	`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: `${type === "qemu" ? "sata" : "mp"}${form.get("device")}`,
				storage: form.get("storage-select"),
				size: form.get("size")
			};
			let result = await requestAPI("/instance/disk/create", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});
}

async function handleCDAdd() {
	let content = "iso";
	let storage = await requestPVE(`/nodes/${node}/storage`, "GET");

	let header = `Add a CDROM`;

	let storageOptions = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			storageOptions += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	let storageSelect = `<label for="storage-select">Storage</label><select class="w3-select w3-border" name="storage-select" id="storage-select" required><option hidden disabled selected value></option>${storageOptions}</select>`;

	let body = `
		<label for="device">IDE</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="3" required></input>
		${storageSelect}
		<label for="iso-select">Image</label><select class="w3-select w3-border" name="iso-select" id="iso-select" required></select>
	`;

	let d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				disk: `ide${form.get("device")}`,
				iso: form.get("iso-select")
			};
			let result = await requestAPI("/instance/disk/create", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateDisk();
			}
			else {
				alert(result.error);
				await getConfig();
				populateDisk();
			}
		}
	});

	d.querySelector("#storage-select").addEventListener("change", async () => {
		let storage = document.querySelector("#storage-select").value;
		let ISOSelect = document.querySelector("#iso-select");
		ISOSelect.innerHTML = `<option hidden disabled selected value></option>`;
		let isos = await requestPVE(`/nodes/${node}/storage/${storage}/content`, "GET", { content: content });
		isos.data.forEach((element) => {
			if (element.content.includes(content)) {
				ISOSelect.append(new Option(element.volid.replace(`${storage}:${content}/`, ""), element.volid));
			}
		});
	});
}

function populateNetworks() {
	document.querySelector("#networks").innerHTML = "";
	let networks = {};
	let prefix = networkMetaData.prefix;
	Object.keys(config.data).forEach((element) => {
		if (element.startsWith(prefix)) {
			networks[element.replace(prefix, "")] = config.data[element];
		}
	});
	let ordered_keys = getOrdered(networks);
	ordered_keys.forEach((element) => {
		addNetworkLine("networks", prefix, element, networks[element]);
	});

	document.querySelector("#network-add").addEventListener("click", handleNetworkAdd)
}

function addNetworkLine(fieldset, prefix, netID, netDetails) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = "images/resources/network.svg";
	icon.alt = `${prefix}${netID}`;
	icon.dataset.network = netID;
	icon.dataset.netvals = netDetails;
	field.appendChild(icon);

	let netLabel = document.createElement("label");
	netLabel.innerText = `${prefix}${netID}`;
	netLabel.dataset.network = netID;
	netLabel.dataset.netvals = netDetails;
	field.append(netLabel);

	let netDesc = document.createElement("p");
	netDesc.innerText = netDetails;
	netDesc.dataset.network = netID;
	netDesc.dataset.netvals = netDetails;
	field.append(netDesc);

	let actionDiv = document.createElement("div");

	let configBtn = document.createElement("img");
	configBtn.classList.add("clickable");
	configBtn.src = `images/actions/network/config.svg`;
	configBtn.title = "Config Interface";
	configBtn.addEventListener("click", handleNetworkConfig);
	configBtn.dataset.network = netID;
	configBtn.dataset.netvals = netDetails;
	actionDiv.appendChild(configBtn);

	let deleteBtn = document.createElement("img");
	deleteBtn.classList.add("clickable");
	deleteBtn.src = `images/actions/delete-active.svg`;
	deleteBtn.title = "Delete Interface";
	deleteBtn.addEventListener("click", handleNetworkDelete);
	deleteBtn.dataset.network = netID;
	deleteBtn.dataset.netvals = netDetails;
	actionDiv.appendChild(deleteBtn);

	field.append(actionDiv);
}

async function handleNetworkConfig() {
	let netID = this.dataset.network;
	let netDetails = this.dataset.netvals;
	let header = `Edit net${netID}`;
	let body = `<label for="rate">Rate Limit (MB/s)</label><input type="number" id="rate" name="rate" class="w3-input w3-border">`;

	let d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-network="${netID}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				netid: netID,
				rate: form.get("rate")
			}
			let result = await requestAPI("/instance/network/modify", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateNetworks();
			}
			else {
				alert(result.error);
				await getConfig();
				populateNetworks();
			}
		}
	});

	d.querySelector("#rate").value = netDetails.split("rate=")[1].split(",")[0];
}

async function handleNetworkDelete() {
	let netID = this.dataset.network;
	let header = `Delete net${netID}`;
	let body = ``;

	let d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			document.querySelector(`img[data-network="${netID}"]`).src = "images/status/loading.svg";
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				netid: netID
			}
			let result = await requestAPI("/instance/network/delete", "DELETE", body);
			if (result.status === 200) {
				await getConfig();
				populateNetworks();
			}
			else {
				alert(result.error);
				await getConfig();
				populateNetworks();
			}
		}
	});
}

async function handleNetworkAdd() {
	let header = `Create Network Interface`;
	let body = `<label for="netid">Interface ID</label><input type="number" id="netid" name="netid" class="w3-input w3-border"><label for="rate">Rate Limit (MB/s)</label><input type="number" id="rate" name="rate" class="w3-input w3-border">`;
	if (type === "lxc") {
		body += `<label for="name">Interface Name</label><input type="text" id="name" name="name" class="w3-input w3-border"></input>`;
	}

	let d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			let body = {
				node: node,
				type: type,
				vmid: vmid,
				netid: form.get("netid"),
				rate: form.get("rate")
			}
			if (type === "lxc") {
				body.name = form.get("name")
			}
			let result = await requestAPI("/instance/network/create", "POST", body);
			if (result.status === 200) {
				await getConfig();
				populateNetworks();
			}
			else {
				alert(result.error);
				await getConfig();
				populateNetworks();
			}
		}
	});
}

function populateDevices() {
	if (type === "qemu") {
		document.querySelector("#devices-card").classList.remove("none");
		document.querySelector("#devices").innerHTML = "";
		let devices = {};
		let prefix = pcieMetaData.prefix;
		Object.keys(config.data).forEach((element) => {
			if (element.startsWith(prefix)) {
				devices[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = getOrdered(devices);
		ordered_keys.forEach(async (element) => {
			let deviceData = await requestAPI(`/instance/pci?node=${node}&type=${type}&vmid=${vmid}&hostpci=${element}`, "GET");
			addDeviceLine("devices", prefix, element, devices[element], deviceData);
		});

		document.querySelector("#device-add").addEventListener("click", handleDeviceAdd)
	}
}

function addDeviceLine(fieldset, prefix, deviceID, deviceDetails, deviceData) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = "images/resources/device.svg";
	icon.alt = `${prefix}${deviceID}`;
	icon.dataset.device = deviceID;
	icon.dataset.values = deviceDetails;
	field.appendChild(icon);

	let deviceLabel = document.createElement("p");
	let deviceNames = Array.from(deviceData, element => element.device_name);
	deviceLabel.innerText = deviceNames.toString();
	deviceLabel.dataset.device = deviceID;
	deviceLabel.dataset.values = deviceDetails;
	field.append(deviceLabel);

	let actionDiv = document.createElement("div");

	let configBtn = document.createElement("img");
	configBtn.classList.add("clickable");
	configBtn.src = `images/actions/device/config.svg`;
	configBtn.title = "Config Device";
	configBtn.addEventListener("click", handleDeviceConfig);
	configBtn.dataset.device = deviceID;
	configBtn.dataset.values = deviceDetails;
	actionDiv.appendChild(configBtn);

	let deleteBtn = document.createElement("img");
	deleteBtn.classList.add("clickable");
	deleteBtn.src = `images/actions/delete-active.svg`;
	deleteBtn.title = "Delete Device";
	deleteBtn.addEventListener("click", handleDeviceDelete);
	configBtn.dataset.device = deviceID;
	configBtn.dataset.values = deviceDetails;
	actionDiv.appendChild(deleteBtn);

	field.append(actionDiv);
}

async function handleDeviceDelete() { } // TODO

async function handleDeviceConfig() { } // TODO

async function handleDeviceAdd() { } // TODO

async function handleFormExit() {
	let body = {
		node: node,
		type: type,
		vmid: vmid,
		cores: document.querySelector("#Cores").value,
		memory: document.querySelector("#Memory").value
	}
	if (type === "lxc") {
		body.swap = document.querySelector("#Swap").value;
	}
	let result = await requestAPI("/instance/resources", "POST", body);
	if (result.status === 200) {
		await getConfig();
		populateDisk();
		goToPage("index.html");
	}
	else {
		alert(result.error);
	}
}