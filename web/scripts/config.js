import { requestPVE, requestAPI, goToPage, getURIData, setAppearance, setSVGSrc, requestDash } from "./utils.js";
import { alert, dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

let node;
let type;
let vmid;

async function init () {
	setAppearance();

	const uriData = getURIData();
	node = uriData.node;
	type = uriData.type;
	vmid = uriData.vmid;

	initVolumes();
	initNetworks();
	initDevices();

	document.querySelector("#exit").addEventListener("click", handleFormExit);
}

class VolumeAction extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		if (this.dataset.type === "move") {
			this.addEventListener("click", this.handleDiskMove);
		}
		else if (this.dataset.type === "resize") {
			this.addEventListener("click", this.handleDiskResize);
		}
		else if (this.dataset.type === "delete") {
			this.addEventListener("click", this.handleDiskDelete);
		}
		else if (this.dataset.type === "attach") {
			this.addEventListener("click", this.handleDiskAttach);
		}
		else if (this.dataset.type === "detach") {
			this.addEventListener("click", this.handleDiskDetach);
		}
	}

	async setStatusLoading () {
		const svg = document.querySelector(`svg[data-volume="${this.dataset.volume}"]`);
		setSVGSrc(svg, "images/status/loading.svg");
	}

	async handleDiskDetach () {
		const disk = this.dataset.volume;
		const header = `Detach ${disk}`;
		const body = `<p>Are you sure you want to detach disk ${disk}</p>`;
		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				this.setStatusLoading();
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/detach`, "POST");
				if (result.status !== 200) {
					alert(`Attempted to detach ${disk} but got: ${result.error}`);
				}
				refreshVolumes();
				refreshBoot();
			}
		});
	}

	async handleDiskAttach () {
		const header = `Attach ${this.dataset.volume}`;
		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="device">${type === "qemu" ? "SCSI" : "MP"}</label>
				<input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "30" : "255"}" required>
			</form>
		`;

		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				const device = form.get("device");
				this.setStatusLoading();
				const body = {
					source: this.dataset.volume.replace("unused", "")
				};
				const prefix = type === "qemu" ? "scsi" : "mp";
				const disk = `${prefix}${device}`;
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/attach`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to attach ${this.dataset.volume} to ${disk} but got: ${result.error}`);
				}
				refreshVolumes();
				refreshBoot();
			}
		});
	}

	async handleDiskResize () {
		const header = `Resize ${this.dataset.volume}`;
		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="size-increment">Size Increment (GiB)</label>
				<input class="w3-input w3-border" name="size-increment" id="size-increment" type="number" min="0" max="131072">
			</form>
		`;

		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				const disk = this.dataset.volume;
				this.setStatusLoading();
				const body = {
					size: form.get("size-increment")
				};
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/resize`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to resize ${disk} but got: ${result.error}`);
				}
				refreshVolumes();
				refreshBoot();
			}
		});
	}

	async handleDiskMove () {
		const content = type === "qemu" ? "images" : "rootdir";
		const storage = await requestPVE(`/nodes/${node}/storage`, "GET");
		const header = `Move ${this.dataset.volume}`;
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
				const disk = this.dataset.volume;
				this.setStatusLoading();
				const body = {
					storage: form.get("storage-select"),
					delete: form.get("delete-check") === "on" ? "1" : "0"
				};
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/move`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to move ${disk} to ${body.storage} but got: ${result.error}`);
				}
				refreshVolumes();
				refreshBoot();
			}
		});
	}

	async handleDiskDelete () {
		const disk = this.dataset.volume;
		const header = `Delete ${disk}`;
		const body = `<p>Are you sure you want to <strong>delete</strong> disk ${disk}</p>`;
		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				this.setStatusLoading();
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/delete`, "DELETE");
				if (result.status !== 200) {
					alert(`Attempted to delete ${disk} but got: ${result.error}`);
				}
				refreshVolumes();
				refreshBoot();
			}
		});
	}
}

customElements.define("volume-action", VolumeAction);

async function initVolumes () {
	document.querySelector("#disk-add").addEventListener("click", handleDiskAdd);
	if (type === "qemu") {
		document.querySelector("#cd-add").addEventListener("click", handleCDAdd);
	}
}

async function refreshVolumes () {
	let volumes = await requestDash(`/config/volumes?node=${node}&type=${type}&vmid=${vmid}`, "GET");
	if (volumes.status !== 200) {
		alert("Error fetching instance volumes.");
	}
	else {
		volumes = volumes.data;
		const container = document.querySelector("#volumes");
		container.setHTMLUnsafe(volumes);
	}

	initVolumes();
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
			<label for="device">${type === "qemu" ? "SCSI" : "MP"}</label><input class="w3-input w3-border" name="device" id="device" type="number" min="0" max="${type === "qemu" ? "30" : "255"}" value="0" required>
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
			const prefix = type === "qemu" ? "scsi" : "mp";
			const disk = `${prefix}${id}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/disk/${disk}/create`, "POST", body);
			if (result.status !== 200) {
				alert(`Attempted to create ${disk} but got: ${result.error}`);
			}
			refreshVolumes();
			refreshBoot();
		}
	});
}

async function handleCDAdd () {
	const isos = await requestAPI("/user/vm-isos", "GET");
	const header = "Mount a CDROM";
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
				alert(`Attempted to mount ${body.iso} to ${disk} but got: result.error`);
			}
			refreshVolumes();
			refreshBoot();
		}
	});

	const isoSelect = d.querySelector("#iso-select");

	for (const iso of isos) {
		isoSelect.append(new Option(iso.name, iso.volid));
	}
	isoSelect.selectedIndex = -1;
}

class NetworkAction extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		if (this.dataset.type === "config") {
			this.addEventListener("click", this.handleNetworkConfig);
		}
		else if (this.dataset.type === "delete") {
			this.addEventListener("click", this.handleNetworkDelete);
		}
	}

	async setStatusLoading () {
		const svg = document.querySelector(`svg[data-network="${this.dataset.network}"]`);
		setSVGSrc(svg, "images/status/loading.svg");
	}

	async handleNetworkConfig () {
		const netID = this.dataset.network;
		const netDetails = this.dataset.value;
		const header = `Edit ${netID}`;
		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="rate">Rate Limit (MB/s)</label><input type="number" id="rate" name="rate" class="w3-input w3-border">
			</form>
		`;

		const d = dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				this.setStatusLoading();
				const body = {
					rate: form.get("rate")
				};
				const net = `${netID}`;
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/${net}/modify`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to change ${net} but got: ${result.error}`);
				}
				refreshNetworks();
				refreshBoot();
			}
		});

		d.querySelector("#rate").value = netDetails.split("rate=")[1].split(",")[0];
	}

	async handleNetworkDelete () {
		const netID = this.dataset.network;
		const header = `Delete ${netID}`;
		const body = "";
		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				setSVGSrc(document.querySelector(`svg[data-network="${netID}"]`), "images/status/loading.svg");
				const net = `${netID}`;
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/${net}/delete`, "DELETE");
				if (result.status !== 200) {
					alert(`Attempted to delete ${net} but got: ${result.error}`);
				}
				refreshNetworks();
				refreshBoot();
			}
		});
	}
}

customElements.define("network-action", NetworkAction);

async function initNetworks () {
	document.querySelector("#network-add").addEventListener("click", handleNetworkAdd);
}

async function refreshNetworks () {
	let nets = await requestDash(`/config/nets?node=${node}&type=${type}&vmid=${vmid}`, "GET");
	if (nets.status !== 200) {
		alert("Error fetching instance nets.");
	}
	else {
		nets = nets.data;
		const container = document.querySelector("#networks");
		container.setHTMLUnsafe(nets);
	}

	initNetworks();
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
			const id = form.get("netid");
			const net = `net${id}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/net/${net}/create`, "POST", body);
			if (result.status !== 200) {
				alert(`Attempted to create ${net} but got: ${result.error}`);
			}
			refreshNetworks();
			refreshBoot();
		}
	});
}

class DeviceAction extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		if (this.dataset.type === "config") {
			this.addEventListener("click", this.handleDeviceConfig);
		}
		else if (this.dataset.type === "delete") {
			this.addEventListener("click", this.handleDeviceDelete);
		}
	}

	async setStatusLoading () {
		const svg = document.querySelector(`svg[data-device="${this.dataset.device}"]`);
		setSVGSrc(svg, "images/status/loading.svg");
	}

	async handleDeviceConfig () {
		const deviceID = this.dataset.device;
		const deviceDetails = this.dataset.value;
		const deviceName = this.dataset.name;
		const header = `Edit Expansion Card ${deviceID}`;
		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="device">Device</label><select id="device" name="device" required></select><label for="pcie">PCI-Express</label><input type="checkbox" id="pcie" name="pcie" class="w3-input w3-border">
			</form>
		`;

		const d = dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				this.setStatusLoading();
				const body = {
					device: form.get("device"),
					pcie: form.get("pcie") ? 1 : 0
				};
				const device = `${deviceID}`;
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/${device}/modify`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to add ${device} but got: ${result.error}`);
				}
				refreshDevices();
			}
		});

		const availDevices = await requestAPI(`/cluster/${node}/pci`, "GET");
		d.querySelector("#device").append(new Option(deviceName, deviceDetails.split(",")[0]));
		for (const availDevice of availDevices) {
			d.querySelector("#device").append(new Option(availDevice.device_name, availDevice.device_bus));
		}
		d.querySelector("#pcie").checked = deviceDetails.includes("pcie=1");
	}

	async handleDeviceDelete () {
		const deviceID = this.dataset.device;
		const header = `Remove Expansion Card ${deviceID}`;
		const body = "";
		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				this.setStatusLoading();
				const device = `${deviceID}`;
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/${device}/delete`, "DELETE");
				if (result.status !== 200) {
					alert(`Attempted to delete ${device} but got: ${result.error}`);
				}
				refreshDevices();
			}
		});
	}
}

customElements.define("device-action", DeviceAction);

async function initDevices () {
	if (type === "qemu") {
		document.querySelector("#device-add").addEventListener("click", handleDeviceAdd);
	}
}

async function refreshDevices () {
	let devices = await requestDash(`/config/devices?node=${node}&type=${type}&vmid=${vmid}`, "GET");
	if (devices.status !== 200) {
		alert("Error fetching instance devices.");
	}
	else {
		devices = devices.data;
		const container = document.querySelector("#devices");
		container.setHTMLUnsafe(devices);
	}

	initDevices();
}

async function handleDeviceAdd () {
	const header = "Add Expansion Card";
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="hostpci">Device Bus</label><input type="number" id="hostpci" name="hostpci" class="w3-input w3-border">
			<label for="device">Device</label><select id="device" name="device" required></select>
			<label for="pcie">PCI-Express</label><input type="checkbox" id="pcie" name="pcie" class="w3-input w3-border">
		</form>
	`;
	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const hostpci = form.get("hostpci");
			const body = {
				device: form.get("device"),
				pcie: form.get("pcie") ? 1 : 0
			};
			const deviceID = `hostpci${hostpci}`;
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/pci/${deviceID}/create`, "POST", body);
			if (result.status !== 200) {
				alert(`Attempted to add ${body.device} but got: ${result.error}`);
			}
			refreshDevices();
		}
	});

	const availDevices = await requestAPI(`/cluster/${node}/pci`, "GET");
	for (const availDevice of availDevices) {
		d.querySelector("#device").append(new Option(availDevice.device_name, availDevice.device_bus));
	}
	d.querySelector("#pcie").checked = true;
}

async function refreshBoot () {
	let boot = await requestDash(`/config/boot?node=${node}&type=${type}&vmid=${vmid}`, "GET");
	if (boot.status !== 200) {
		alert("Error fetching instance boot order.");
	}
	else {
		boot = boot.data;
		const order = document.querySelector("#boot-order");
		order.setHTMLUnsafe(boot);
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
		goToPage("index");
	}
	else {
		alert(`Attempted to set basic resources but got: ${result.error}`);
	}
}
