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

	document.querySelector("#config-form").addEventListener("submit", handleFormExit);
}

class VolumeAction extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		this.template = this.shadowRoot.querySelector("#dialog-template");
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
		dialog(this.template, async (result, form) => {
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
		dialog(this.template, async (result, form) => {
			if (result === "confirm") {
				const device = form.get("device");
				this.setStatusLoading();
				const body = {
					source: this.dataset.volume.replace("unused", ""),
					mp: form.get("mp")
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
		dialog(this.template, async (result, form) => {
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
		const d = dialog(this.template, async (result, form) => {
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
		const content = type === "qemu" ? "images" : "rootdir";
		const storage = await requestPVE(`/nodes/${node}/storage`, "GET");
		const select = d.querySelector("#storage-select");
		storage.data.forEach((element) => {
			if (element.content.includes(content)) {
				select.add(new Option(element.storage));
			}
			select.selectedIndex = -1;
		});
	}

	async handleDiskDelete () {
		const disk = this.dataset.volume;
		dialog(this.template, async (result, form) => {
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
	const template = document.querySelector("#add-disk-dialog");
	const d = dialog(template, async (result, form) => {
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

	const content = type === "qemu" ? "images" : "rootdir";
	const storage = await requestPVE(`/nodes/${node}/storage`, "GET");
	const select = d.querySelector("#storage-select");
	storage.data.forEach((element) => {
		if (element.content.includes(content)) {
			select.add(new Option(element.storage));
		}
		select.selectedIndex = -1;
	});
}

async function handleCDAdd () {
	const template = document.querySelector("#add-cd-dialog");
	const d = dialog(template, async (result, form) => {
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

	const isos = await requestAPI("/user/vm-isos", "GET");
	const select = d.querySelector("#iso-select");

	for (const iso of isos) {
		select.add(new Option(iso.name, iso.volid));
	}
	select.selectedIndex = -1;
}

class NetworkAction extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		this.template = this.shadowRoot.querySelector("#dialog-template");
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
		const netDetails = this.dataset.value;
		const netID = this.dataset.network;
		const d = dialog(this.template, async (result, form) => {
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
		dialog(this.template, async (result, form) => {
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
	const template = document.querySelector("#add-net-dialog");
	dialog(template, async (result, form) => {
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
		this.template = this.shadowRoot.querySelector("#dialog-template");
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
		const d = dialog(this.template, async (result, form) => {
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
		dialog(this.template, async (result, form) => {
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
	const template = document.querySelector("#add-device-dialog");
	const d = dialog(template, async (result, form) => {
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
	else if (type === "qemu") {
		boot = boot.data;
		const order = document.querySelector("#boot-order");
		order.setHTMLUnsafe(boot);
	}
}

async function handleFormExit (event) {
	event.preventDefault();
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
