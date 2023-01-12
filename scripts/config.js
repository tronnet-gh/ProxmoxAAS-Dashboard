import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let diskConfig = {
	lxc: {
		storageContent: "rootdir",
		prefixOrder: ["mp"],
		mp: {name: "MP", limit: 255, used: {}}
	},
	qemu: {
		storageContent: "images",
		prefixOrder: ["sata", "ide"],
		ide: {name: "IDE", limit: 3, used: {}},
		sata: {name: "SATA", limit: 5, used: {}}
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
	await populateAddDisk();

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});

	/**
	 * Add disk qemu: POST config with sata4:"cephpl:4"
	 * Add disk lxc POST config with mp2:"cephpl:8,mp=/test/,backup=1"
	 */
}

async function populateResources () {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);

	let name = type === "qemu" ? "name" : "hostname";
	addMetaLine("name", "Name", {type: "text", value: config.data[name]});
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "GiB"); // TODO add max from quota API
		addDiskLine("disks", "rootfs", "images/resources/drive.svg", "Root FS", config.data.rootfs);
	}

	for(let i = 0; i < diskConfig[type].prefixOrder.length; i++){
		let prefix = diskConfig[type].prefixOrder[i];
		let entry = diskConfig[type][prefix];
		let name = entry.name;
		Object.keys(config.data).forEach(element => {
			if (element.startsWith(prefix)) {
				entry.used[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = getOrderedUsed(entry);
		ordered_keys.forEach(element => {
			addDiskLine("disks", `${prefix}${element}`, entry.used[element].includes("media=cdrom") ? "images/resources/disk.svg" : "images/resources/drive.svg", `${name} ${element}`, entry.used[element]);
		});
	}
}

function addMetaLine (fieldset, labelText, inputAttr) {
	let field = document.querySelector(`#${fieldset}`);

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

function addDiskLine (fieldset, id, iconHref, labelText, valueText) {
	let field = document.querySelector(`#${fieldset}`);

	let icon = document.createElement("img");
	icon.src = iconHref;
	icon.alt = labelText;
	field.append(icon);

	let label = document.createElement("label");
	label.innerHTML = labelText;
	field.append(label);

	let value = document.createElement("p");
	value.innerText = valueText;
	field.append(value);

	let configDiv = document.createElement("div");
	configDiv.classList.add("last-item");
	let config = document.createElement("img");
	config.src = "images/actions/config-active.svg";
	config.alt = `Config disk ${labelText}`;
	config.classList.add("clickable");
	configDiv.append(config);
	field.append(configDiv);
}

async function populateAddDisk () {
	let addDiskBus = document.querySelector("#add-disk #bus");
	diskConfig[type].prefixOrder.forEach(element => {
		addDiskBus.add(new Option(diskConfig[type][element].name, element));
	});
	addDiskBus.value = diskConfig[type].prefixOrder[0];
	handleDiskBusChange(diskConfig);
	if (type === "lxc") {
		addDiskBus.disabled = true;
	}
	addDiskBus.addEventListener("change", handleDiskBusChange);

	let addDiskDevice = document.querySelector("#add-disk #device");
	addDiskDevice.addEventListener("input", handleDiskDeviceChange);
	addDiskDevice.addEventListener("focus", handleDiskDeviceChange);

	let addDiskStorage = document.querySelector("#add-disk #storage");
	let storage = await request(`/nodes/${node}/storage`);
	storage.data.forEach((element) => {
		if (element.content.includes(diskConfig[type].storageContent)) { // check if the storage contains rootdir or images content
			addDiskStorage.add(new Option(element.storage));
		}
	});

	let addDiskSize = document.querySelector("#add-disk #size");

	let addDiskPath = document.querySelector("#add-disk #path");
	if (type === "qemu") {
		addDiskPath.disabled = true;
	}
}

function handleDiskBusChange () {
	let bus = document.querySelector("#add-disk #bus").value;
	let entry = diskConfig[type][bus];
	let limit = entry.limit;
	let addDiskDevice = document.querySelector("#add-disk #device");
	addDiskDevice.max = limit;
	let nextAvaliable = getNextAvaliable(entry);
	if (nextAvaliable > limit) {
		addDiskDevice.value = 0;
	}
	else {
		addDiskDevice.value = nextAvaliable;
	}
	handleDiskDeviceChange();
}

function handleDiskDeviceChange () {
	let value = document.querySelector("#add-disk #device").value;
	let bus = document.querySelector("#add-disk #bus").value;
	let entry = diskConfig[type][bus];
	let addDiskDevice = document.querySelector("#add-disk #device");
	if(value in entry.used){
		addDiskDevice.style.border = "solid red 1px";
	}
	else {
		addDiskDevice.style.border = "solid white 1px";
	}
}

function getOrderedUsed(entry){
	let ordered_keys = Object.keys(entry.used).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}

function getNextAvaliable(entry){
	let ordered_keys = getOrderedUsed(entry);
	let nextAvaliable = 0;
	ordered_keys.forEach(element => {
		if (parseInt(element) === nextAvaliable) {
			nextAvaliable++;
		}
	});
	return nextAvaliable;
}