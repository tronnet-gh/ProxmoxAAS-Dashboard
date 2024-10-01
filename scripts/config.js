import { requestPVE, requestAPI, goToPage, getURIData, resourcesConfig, setTitleAndHeader, bootConfig, setAppearance, setSVGSrc, setSVGAlt, mergeDeep, addResourceLine } from "./utils.js";
import { alert, dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init); // do the dumb thing where the disk config refreshes every second

const diskMetaData = resourcesConfig.disk;
const networkMetaData = resourcesConfig.network;
const pcieMetaData = resourcesConfig.pci;
const bootMetaData = bootConfig;

let node;
let type;
let vmid;
let config;

const resourceInputTypes = { // input types for each resource for config page
	cpu: {
		element: "select",
		attributes: {}
	},
	cores: {
		element: "input",
		attributes: {
			type: "number"
		}
	},
	memory: {
		element: "input",
		attributes: {
			type: "number"
		}
	},
	swap: {
		element: "input",
		attributes: {
			type: "number"
		}
	}
};

const resourcesConfigPage = mergeDeep({}, resourcesConfig, resourceInputTypes);

async function init () {
	setAppearance();
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	const uriData = getURIData();
	node = uriData.node;
	type = uriData.type;
	vmid = uriData.vmid;

	await getConfig();

	const name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerHTML = document.querySelector("#name").innerHTML.replace("%{vmname}", config.data[name]);

	populateResources();
	populateDisk();
	populateNetworks();
	populateDevices();
	populateBoot();

	document.querySelector("#exit").addEventListener("click", handleFormExit);
}

function getOrdered (keys) {
	const orderedKeys = Object.keys(keys).sort((a, b) => {
		return parseInt(a) - parseInt(b);
	}); // ordered integer list
	return orderedKeys;
}

async function getConfig () {
	config = await requestPVE(`/nodes/${node}/${type}/${vmid}/config`, "GET");
}

async function populateResources () {
	const field = document.querySelector("#resources");
	if (type === "qemu") {
		const global = (await requestAPI("/global/config/resources")).resources;
		const user = await requestAPI("/user/config/resources");
		let options = [];
		const globalCPU = global.cpu;
		const userCPU = node in user.cpu.nodes ? user.cpu.nodes[node] : user.cpu.global;
		if (globalCPU.whitelist) {
			userCPU.forEach((userType) => {
				options.push(userType.name);
			});
			options = options.sort((a, b) => {
				return a.localeCompare(b);
			});
		}
		else {
			const supported = await requestPVE(`/nodes/${node}/capabilities/qemu/cpu`);
			supported.data.forEach((supportedType) => {
				if (!userCPU.some((userType) => supportedType.name === userType.name)) {
					options.push(supportedType.name);
				}
			});
			options = options.sort((a, b) => {
				return a.localeCompare(b);
			});
		}
		addResourceLine(resourcesConfigPage, field, "cpu", { value: config.data.cpu, options });
	}
	addResourceLine(resourcesConfigPage, field, "cores", { value: config.data.cores, min: 1, max: 8192 });
	addResourceLine(resourcesConfigPage, field, "memory", { value: config.data.memory, min: 16, step: 1 });
	if (type === "lxc") {
		addResourceLine(resourcesConfigPage, field, "swap", { value: config.data.swap, min: 0, step: 1 });
	}
}

async function populateDisk () {
	document.querySelector("#disks").innerHTML = "";
	for (let i = 0; i < diskMetaData[type].prefixOrder.length; i++) {
		const prefix = diskMetaData[type].prefixOrder[i];
		const busName = diskMetaData[type][prefix].name;
		const disks = {};
		Object.keys(config.data).forEach((element) => {
			if (element.startsWith(prefix)) {
				disks[element.replace(prefix, "")] = config.data[element];
			}
		});
		const orderedKeys = getOrdered(disks);
		orderedKeys.forEach((element) => {
			const disk = disks[element];
			addDiskLine("disks", prefix, busName, element, disk);
		});
	}
	document.querySelector("#disk-add").addEventListener("click", handleDiskAdd);

	if (type === "qemu") {
		document.querySelector("#cd-add").classList.remove("none");
		document.querySelector("#cd-add").addEventListener("click", handleCDAdd);
	}
}

function addDiskLine (fieldset, busPrefix, busName, device, diskDetails) {
	const field = document.querySelector(`#${fieldset}`);

	const diskName = `${busName} ${device}`;
	const diskID = `${busPrefix}${device}`;

	// Set the disk icon, either drive.svg or disk.svg
	const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	setSVGSrc(icon, diskMetaData[type][busPrefix].icon);
	setSVGAlt(icon, diskName);
	icon.dataset.disk = diskID;
	field.append(icon);

	// Add a label for the disk bus and device number
	const diskLabel = document.createElement("p");
	diskLabel.innerText = diskName;
	diskLabel.dataset.disk = diskID;
	field.append(diskLabel);

	// Add text of the disk configuration
	const diskDesc = document.createElement("p");
	diskDesc.innerText = diskDetails;
	diskDesc.dataset.disk = diskID;
	diskDesc.style.overflowX = "hidden";
	diskDesc.style.whiteSpace = "nowrap";
	field.append(diskDesc);

	const actionDiv = document.createElement("div");
	diskMetaData.actionBarOrder.forEach((element) => {
		const action = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("attach")) { // attach
			setSVGSrc(action, diskMetaData.actions.attach.src);
			setSVGAlt(action, diskMetaData.actions.attach.title);
			action.title = "Attach Disk";
			action.addEventListener("click", handleDiskAttach);
			action.classList.add("clickable");
		}
		else if (element === "detach_attach" && diskMetaData[type][busPrefix].actions.includes("detach")) { // detach
			setSVGSrc(action, diskMetaData.actions.detach.src);
			setSVGAlt(action, diskMetaData.actions.detach.title);
			action.addEventListener("click", handleDiskDetach);
			action.classList.add("clickable");
		}
		else if (element === "delete") {
			const active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			setSVGSrc(action, `images/actions/delete-${active}.svg`);
			setSVGAlt(action, "Delete Disk");
			if (active === "active") {
				action.addEventListener("click", handleDiskDelete);
				action.classList.add("clickable");
			}
		}
		else {
			const active = diskMetaData[type][busPrefix].actions.includes(element) ? "active" : "inactive"; // resize
			setSVGSrc(action, `images/actions/disk/${element}-${active}.svg`);
			if (active === "active") {
				setSVGAlt(action, `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`);
				if (element === "move") {
					action.addEventListener("click", handleDiskMove);
				}
				else if (element === "resize") {
					action.addEventListener("click", handleDiskResize);
				}
				action.classList.add("clickable");
			}
		}
		action.dataset.disk = diskID;
		actionDiv.append(action);
	});
	field.append(actionDiv);
}

async function handleDiskDetach () {
	const disk = this.dataset.disk;
	const header = `Detach ${disk}`;
	const body = `<p>Are you sure you want to detach disk ${disk}</p>`;
	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-disk="${disk}"]`), "images/status/loading.svg");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/detach`, "POST");
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			deleteBootLine(`boot-${disk}`);
		}
	});
}

async function handleDiskAttach () {
	const header = `Attach ${this.dataset.disk}`;
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="device">${type === "qemu" ? "SATA" : "MP"}</label>
			<input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" required>
		</form>
	`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const device = form.get("device");
			setSVGSrc(document.querySelector(`svg[data-disk="${this.dataset.disk}"]`), "images/status/loading.svg");
			const body = {
				source: this.dataset.disk.replace("unused", "")
			};
			const prefix = type === "qemu" ? "sata" : "mp";
			const disk = `${prefix}${device}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/attach`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			addBootLine("disabled", { id: disk, prefix, value: disk, detail: config.data[disk] });
		}
	});
}

async function handleDiskResize () {
	const header = `Resize ${this.dataset.disk}`;
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="size-increment">Size Increment (GiB)</label>
			<input class="w3-input w3-border" name="size-increment" id="size-increment" type="number" min="0" max="131072">
		</form>
		`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const disk = this.dataset.disk;
			setSVGSrc(document.querySelector(`svg[data-disk="${disk}"]`), "images/status/loading.svg");
			const body = {
				size: form.get("size-increment")
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/resize`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			const prefix = bootMetaData.eligiblePrefixes.find((pref) => disk.startsWith(pref));
			updateBootLine(`boot-${disk}`, { id: disk, prefix, value: disk, detail: config.data[disk] });
		}
	});
}

async function handleDiskMove () {
	const content = type === "qemu" ? "images" : "rootdir";
	const storage = await requestPVE(`/nodes/${node}/storage`, "GET");

	const header = `Move ${this.dataset.disk}`;

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	const select = `<label for="storage-select">Storage</label><select class="w3-select w3-border" name="storage-select" id="storage-select"><option hidden disabled selected value></option>${options}</select>`;

	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			${select}
			<label for="delete-check">Delete Source</label><input class="w3-input w3-border" name="delete-check" id="delete-check" type="checkbox" checked required>
		</form>
	`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const disk = this.dataset.disk;
			setSVGSrc(document.querySelector(`svg[data-disk="${disk}"]`), "images/status/loading.svg");
			const body = {
				storage: form.get("storage-select"),
				delete: form.get("delete-check") === "on" ? "1" : "0"
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/move`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			const prefix = bootMetaData.eligiblePrefixes.find((pref) => disk.startsWith(pref));
			updateBootLine(`boot-${disk}`, { id: disk, prefix, value: config.data[disk] });
		}
	});
}

async function handleDiskDelete () {
	const disk = this.dataset.disk;
	const header = `Delete ${disk}`;
	const body = `<p>Are you sure you want to <strong>delete</strong> disk${disk}</p>`;
	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-disk="${disk}"]`), "images/status/loading.svg");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/delete`, "DELETE");
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			deleteBootLine(`boot-${disk}`);
		}
	});
}

async function handleDiskAdd () {
	const content = type === "qemu" ? "images" : "rootdir";
	const storage = await requestPVE(`/nodes/${node}/storage`, "GET");

	const header = "Create New Disk";

	let options = "";
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			options += `<option value="${element.storage}">${element.storage}</option>"`;
		}
	});
	const select = `<label for="storage-select">Storage</label><select class="w3-select w3-border" name="storage-select" id="storage-select" required><option hidden disabled selected value></option>${options}</select>`;

	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="device">${type === "qemu" ? "SATA" : "MP"}</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "5" : "255"}" value="0" required>
			${select}
			<label for="size">Size (GiB)</label><input class="w3-input w3-border" name="size" id="size" type="number" min="0" max="131072" required>
		</form>
	`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				storage: form.get("storage-select"),
				size: form.get("size")
			};
			const id = form.get("device");
			const prefix = type === "qemu" ? "sata" : "mp";
			const disk = `${prefix}${id}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/create`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			addBootLine("disabled", { id: disk, prefix, value: disk, detail: config.data[disk] });
		}
	});
}

async function handleCDAdd () {
	const isos = await requestAPI("/user/vm-isos", "GET");

	const header = "Add a CDROM";

	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="device">IDE</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="3" required>
			<label for="iso-select">Image</label><select class="w3-select w3-border" name="iso-select" id="iso-select" required></select>
		</form>
	`;

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				iso: form.get("iso-select")
			};
			const disk = `ide${form.get("device")}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/create`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDisk();
			addBootLine("disabled", { id: disk, prefix: "ide", value: disk, detail: config.data[disk] });
		}
	});

	const isoSelect = d.querySelector("#iso-select");

	for (const iso of isos) {
		isoSelect.append(new Option(iso.name, iso.volid));
	}
	isoSelect.selectedIndex = -1;
}

async function populateNetworks () {
	document.querySelector("#networks").innerHTML = "";
	const networks = {};
	const prefix = networkMetaData.prefix;
	Object.keys(config.data).forEach((element) => {
		if (element.startsWith(prefix)) {
			networks[element.replace(prefix, "")] = config.data[element];
		}
	});
	const orderedKeys = getOrdered(networks);
	orderedKeys.forEach((element) => {
		addNetworkLine("networks", prefix, element, networks[element]);
	});

	document.querySelector("#network-add").addEventListener("click", handleNetworkAdd);
}

function addNetworkLine (fieldset, prefix, netID, netDetails) {
	const field = document.querySelector(`#${fieldset}`);

	const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	setSVGSrc(icon, networkMetaData.icon);
	setSVGAlt(icon, `${prefix}${netID}`);
	icon.dataset.network = netID;
	icon.dataset.values = netDetails;
	field.appendChild(icon);

	const netLabel = document.createElement("p");
	netLabel.innerText = `${prefix}${netID}`;
	netLabel.dataset.network = netID;
	netLabel.dataset.values = netDetails;
	field.append(netLabel);

	const netDesc = document.createElement("p");
	netDesc.innerText = netDetails;
	netDesc.dataset.network = netID;
	netDesc.dataset.values = netDetails;
	netDesc.style.overflowX = "hidden";
	netDesc.style.whiteSpace = "nowrap";
	field.append(netDesc);

	const actionDiv = document.createElement("div");

	const configBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	configBtn.classList.add("clickable");
	setSVGSrc(configBtn, "images/actions/network/config.svg");
	setSVGAlt(configBtn, "Config Interface");
	configBtn.addEventListener("click", handleNetworkConfig);
	configBtn.dataset.network = netID;
	configBtn.dataset.values = netDetails;
	actionDiv.appendChild(configBtn);

	const deleteBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	deleteBtn.classList.add("clickable");
	setSVGSrc(deleteBtn, "images/actions/delete-active.svg");
	setSVGAlt(deleteBtn, "Delete Interface");
	deleteBtn.addEventListener("click", handleNetworkDelete);
	deleteBtn.dataset.network = netID;
	deleteBtn.dataset.values = netDetails;
	actionDiv.appendChild(deleteBtn);

	field.append(actionDiv);
}

async function handleNetworkConfig () {
	const netID = this.dataset.network;
	const netDetails = this.dataset.values;
	const header = `Edit net${netID}`;
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="rate">Rate Limit (MB/s)</label><input type="number" id="rate" name="rate" class="w3-input w3-border">
		</form>
	`;

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-network="${netID}"]`), "images/status/loading.svg");
			const body = {
				rate: form.get("rate")
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/net${netID}/modify`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateNetworks();
			const id = `net${netID}`;
			updateBootLine(`boot-net${netID}`, { id, prefix: "net", value: id, detail: config.data[`net${netID}`] });
		}
	});

	d.querySelector("#rate").value = netDetails.split("rate=")[1].split(",")[0];
}

async function handleNetworkDelete () {
	const netID = this.dataset.network;
	const header = `Delete net${netID}`;
	const body = "";

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-network="${netID}"]`), "images/status/loading.svg");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/net${netID}/delete`, "DELETE");
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateNetworks();
			deleteBootLine(`boot-net${netID}`);
		}
	});
}

async function handleNetworkAdd () {
	const header = "Create Network Interface";
	let body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="netid">Interface ID</label><input type="number" id="netid" name="netid" class="w3-input w3-border">
			<label for="rate">Rate Limit (MB/s)</label><input type="number" id="rate" name="rate" class="w3-input w3-border">
	`;
	if (type === "lxc") {
		body += "<label for=\"name\">Interface Name</label><input type=\"text\" id=\"name\" name=\"name\" class=\"w3-input w3-border\">";
	}
	body += "</form>";

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				rate: form.get("rate")
			};
			if (type === "lxc") {
				body.name = form.get("name");
			}
			const netID = form.get("netid");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/net${netID}/create`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateNetworks();
			const id = `net${netID}`;
			addBootLine("disabled", { id, prefix: "net", value: id, detail: config.data[`net${netID}`] });
		}
	});
}

async function populateDevices () {
	if (type === "qemu") {
		document.querySelector("#devices-card").classList.remove("none");
		document.querySelector("#devices").innerHTML = "";
		const devices = {};
		const prefix = pcieMetaData.prefix;
		Object.keys(config.data).forEach((element) => {
			if (element.startsWith(prefix)) {
				devices[element.replace(prefix, "")] = config.data[element];
			}
		});
		const orderedKeys = getOrdered(devices);
		orderedKeys.forEach(async (element) => {
			const deviceData = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/hostpci${element}`, "GET");
			addDeviceLine("devices", prefix, element, devices[element], deviceData.device_name);
		});

		document.querySelector("#device-add").addEventListener("click", handleDeviceAdd);
	}
}

function addDeviceLine (fieldset, prefix, deviceID, deviceDetails, deviceName) {
	const field = document.querySelector(`#${fieldset}`);

	const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	setSVGSrc(icon, pcieMetaData.icon);
	setSVGAlt(icon, `${prefix}${deviceID}`);
	icon.dataset.device = deviceID;
	icon.dataset.values = deviceDetails;
	icon.dataset.name = deviceName;
	field.appendChild(icon);

	const deviceLabel = document.createElement("p");
	deviceLabel.innerText = deviceName;
	deviceLabel.dataset.device = deviceID;
	deviceLabel.dataset.values = deviceDetails;
	deviceLabel.dataset.name = deviceName;
	deviceLabel.style.overflowX = "hidden";
	deviceLabel.style.whiteSpace = "nowrap";
	field.append(deviceLabel);

	const actionDiv = document.createElement("div");

	const configBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	configBtn.classList.add("clickable");
	setSVGSrc(configBtn, "images/actions/device/config.svg");
	setSVGAlt(configBtn, "Config Device");
	configBtn.addEventListener("click", handleDeviceConfig);
	configBtn.dataset.device = deviceID;
	configBtn.dataset.values = deviceDetails;
	configBtn.dataset.name = deviceName;
	actionDiv.appendChild(configBtn);

	const deleteBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	deleteBtn.classList.add("clickable");
	setSVGSrc(deleteBtn, "images/actions/delete-active.svg");
	setSVGAlt(deleteBtn, "Delete Device");
	deleteBtn.addEventListener("click", handleDeviceDelete);
	deleteBtn.dataset.device = deviceID;
	deleteBtn.dataset.values = deviceDetails;
	deleteBtn.dataset.name = deviceName;
	actionDiv.appendChild(deleteBtn);

	field.append(actionDiv);
}

async function handleDeviceConfig () {
	const deviceID = this.dataset.device;
	const deviceDetails = this.dataset.values;
	const deviceName = this.dataset.name;
	const header = `Edit Expansion Card ${deviceID}`;
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="device">Device</label><select id="device" name="device" required></select><label for="pcie">PCI-Express</label><input type="checkbox" id="pcie" name="pcie" class="w3-input w3-border">
		</form>
	`;

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-device="${deviceID}"]`), "images/status/loading.svg");
			const body = {
				device: form.get("device"),
				pcie: form.get("pcie") ? 1 : 0
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/hostpci${deviceID}/modify`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDevices();
		}
	});

	const availDevices = await requestAPI(`/cluster/${node}/pci`, "GET");
	d.querySelector("#device").append(new Option(deviceName, deviceDetails.split(",")[0]));
	for (const availDevice of availDevices) {
		d.querySelector("#device").append(new Option(availDevice.device_name, availDevice.id));
	}
	d.querySelector("#pcie").checked = deviceDetails.includes("pcie=1");
}

async function handleDeviceDelete () {
	const deviceID = this.dataset.device;
	const header = `Remove Expansion Card ${deviceID}`;
	const body = "";

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			setSVGSrc(document.querySelector(`svg[data-device="${deviceID}"]`), "images/status/loading.svg");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/hostpci${deviceID}/delete`, "DELETE");
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDevices();
		}
	});
}

async function handleDeviceAdd () {
	const header = "Add Expansion Card";
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="device">Device</label><select id="device" name="device" required></select><label for="pcie">PCI-Express</label><input type="checkbox" id="pcie" name="pcie" class="w3-input w3-border">
		</form>
	`;

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				device: form.get("device"),
				pcie: form.get("pcie") ? 1 : 0
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/create`, "POST", body);
			if (result.status !== 200) {
				alert(result.error);
			}
			await getConfig();
			populateDevices();
		}
	});

	const availDevices = await requestAPI(`/cluster/${node}/pci`, "GET");
	for (const availDevice of availDevices) {
		d.querySelector("#device").append(new Option(availDevice.device_name, availDevice.id));
	}
	d.querySelector("#pcie").checked = true;
}

async function populateBoot () {
	if (type === "qemu") {
		document.querySelector("#boot-card").classList.remove("none");
		document.querySelector("#enabled").title = "Enabled";
		document.querySelector("#disabled").title = "Disabled";
		let order = [];
		if (config.data.boot.startsWith("order=")) {
			order = config.data.boot.replace("order=", "").split(";");
		}
		const bootable = { disabled: [] };
		const eligible = bootMetaData.eligiblePrefixes;
		for (let i = 0; i < order.length; i++) {
			const element = order[i];
			const prefix = eligible.find((pref) => order[i].startsWith(pref));
			const detail = config.data[element];
			bootable[i] = { id: element, value: element, prefix, detail };
		}
		Object.keys(config.data).forEach((element) => {
			const prefix = eligible.find((pref) => element.startsWith(pref));
			const detail = config.data[element];
			if (prefix && !order.includes(element)) {
				bootable.disabled.push({ id: element, value: element, prefix, detail });
			}
		});
		Object.keys(bootable).sort();
		Object.keys(bootable).forEach((element) => {
			if (element !== "disabled") {
				addBootLine("enabled", bootable[element], document.querySelector("#enabled-spacer"));
			}
			else {
				bootable.disabled.forEach((item) => {
					addBootLine("disabled", item, document.querySelector("#disabled-spacer"));
				});
			}
		});
	}
}

function addBootLine (container, data, before = null) {
	const item = document.createElement("draggable-item");
	item.data = data;
	item.innerHTML = `
		<div style="display: grid; grid-template-columns: auto auto 8ch 1fr; column-gap: 10px; align-items: center;">
			<svg id="drag" role="application" aria-label="drag icon"><title>drag icon</title><use href="images/actions/drag.svg#symb"></use></svg>
			<svg role="application" aria-label="${bootMetaData[data.prefix].alt}"><title>${bootMetaData[data.prefix].alt}</title><use href="${bootMetaData[data.prefix].icon}#symb"></use></svg>
			<p style="margin: 0px;">${data.id}</p>
			<p style="margin: 0px; overflow-x: hidden; white-space: nowrap;">${data.detail}</p>
		</div>
	`;
	item.id = `boot-${data.id}`;
	if (before) {
		document.querySelector(`#${container}`).insertBefore(item, before);
	}
	else {
		document.querySelector(`#${container}`).append(item);
	}
	item.container = container;
	item.value = data.value;
}

function deleteBootLine (id) {
	const query = `#${id}`;
	const enabled = document.querySelector("#enabled");
	const disabled = document.querySelector("#disabled");
	const inEnabled = enabled.querySelector(query);
	const inDisabled = disabled.querySelector(query);
	if (inEnabled) {
		enabled.removeChild(inEnabled);
	}
	if (inDisabled) {
		disabled.removeChild(inDisabled);
	}
}

function updateBootLine (id, newData) {
	const enabled = document.querySelector("#enabled");
	const disabled = document.querySelector("#disabled");
	let element = null;
	if (enabled.querySelector(`#${id}`)) {
		element = enabled.querySelector(`#${id}`);
	}
	if (disabled.querySelector(`#${id}`)) {
		element = disabled.querySelector(`#${id}`);
	}
	if (element) {
		const container = element.container;
		const before = element.nextSibling;
		deleteBootLine(id);
		addBootLine(container, newData, before);
		return true;
	}
	else {
		return false;
	}
}

async function handleFormExit () {
	const body = {
		cores: document.querySelector("#cores").value,
		memory: document.querySelector("#ram").value
	};
	if (type === "lxc") {
		body.swap = document.querySelector("#swap").value;
	}
	else if (type === "qemu") {
		body.proctype = document.querySelector("#proctype").value;
		body.boot = document.querySelector("#enabled").value;
	}
	const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/resources`, "POST", body);
	if (result.status === 200) {
		goToPage("index.html");
	}
	else {
		alert(result.error);
	}
}
