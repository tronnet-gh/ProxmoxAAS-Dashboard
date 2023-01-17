import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let diskConfig = {
	lxc: {
		prefixOrder: ["mp"],
		mp: {name: "MP", limit: 255, used: {}, icon: "images/resources/drive.svg", storageContent: "rootdir",resizable: true, hasPath: true, hasDiskImage: false}
	},
	qemu: {
		prefixOrder: ["sata", "ide"],
		ide: {name: "IDE", limit: 3, used: {}, icon: "images/resources/disk.svg", storageContent: "iso", reziable: false, hasPath: false, hasDiskImage: true},
		sata: {name: "SATA", limit: 5, used: {}, icon: "images/resources/drive.svg", storageContent: "images", resizable: true, hasPath: false, hasDiskImage: false}
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

	/**
	 * Add disk qemu: POST config with sata4:"cephpl:4"
	 * Add disk lxc POST config with mp2:"cephpl:8,mp=/test/,backup=1"
	 */
}

async function populateResources () {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);

	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerText = config.data[name];
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	
	let storageOptions = await request(`/nodes/${node}/storage`);

	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "MiB"); // TODO add max from quota API
		let rootfs = parseDisk(config.data.rootfs);
		addDiskLine("disks", "mp", "Root FS", null, rootfs, storageOptions);
	}

	for(let i = 0; i < diskConfig[type].prefixOrder.length; i++){
		let prefix = diskConfig[type].prefixOrder[i];
		let entry = diskConfig[type][prefix];
		let busName = entry.name;
		Object.keys(config.data).forEach(element => {
			if (element.startsWith(prefix)) {
				entry.used[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = getOrderedUsed(entry);
		ordered_keys.forEach(element => {
			let disk = parseDisk(entry.used[element]);
			addDiskLine("disks", prefix, busName, element, disk, storageOptions);
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

function addDiskLine (fieldset, busPrefix, busName, device, diskDataParsed, storageOptions) {
	let field = document.querySelector(`#${fieldset}`);
	
	let icon = document.createElement("img");
	icon.src = diskConfig[type][busPrefix].icon;
	icon.alt = `${busName} ${device}`;
	field.append(icon);

	let busLabel = document.createElement("label");
	busLabel.innerHTML = busName;
	field.append(busLabel);

	let deviceInput = document.createElement("input");
	deviceInput.type = "number";
	deviceInput.min = 0;
	deviceInput.max = diskConfig[type][busPrefix].limit;
	deviceInput.value = device;
	if (!device) {
		deviceInput.disabled = true;
		deviceInput.classList.add("hidden");		
	}
	// for now, disable disk device reassignment
	deviceInput.disabled = true;
	//
	deviceInput.addEventListener("change", handleDeviceChange);
	field.append(deviceInput);
	
	let storage = diskDataParsed.storage;
	let storageSelect = document.createElement("select");
	storageOptions.data.forEach((element) => {
		if (element.content.includes(diskConfig[type][busPrefix].storageContent)) { // check if the storage contains rootdir or images content
			storageSelect.add(new Option(element.storage));
		}
	});
	storageSelect.value = storage;
	field.append(storageSelect);

	let size = diskDataParsed.size;
	let sizeInput = document.createElement("input");
	sizeInput.type = "number";
	sizeInput.min = size;
	sizeInput.minSize = size;
	sizeInput.max = 131072; // 128 TiB, everything should just use GiB
	sizeInput.value = size;
	if (!diskConfig[type][busPrefix].resizable) {
		sizeInput.disabled = true;
		sizeInput.classList.add("hidden");
	}
	field.append(sizeInput);

	let sizeUnit = document.createElement("p");
	sizeUnit.innerText = "GiB";
	if (!diskConfig[type][busPrefix].resizable) {
		sizeUnit.classList.add("hidden");
	}
	field.append(sizeUnit);

	let deleteDiv = document.createElement("div");
	deleteDiv.classList.add("last-item");
	let deleteBtn = document.createElement("img");
	deleteBtn.src = "images/actions/delete.svg";
	deleteBtn.alt = `Delete disk ${busName} ${device}`;
	deleteBtn.classList.add("clickable");
	deleteDiv.append(deleteBtn);
	field.append(deleteDiv);
}

function handleDeviceChange () {
}

function getOrderedUsed(entry){
	let ordered_keys = Object.keys(entry.used).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}

function parseDisk (disk) { // disk in format: STORAGE: FILENAME, ARG1=..., ARG2 = ..., ...
	let parsed = {};
	let kvpairs = disk.split(",");
	parsed.storage = kvpairs[0].split(":")[0];
	parsed.filename = kvpairs[0].split(":")[1];
	kvpairs.shift();
	kvpairs.forEach((element) => {
		let key = element.split("=")[0];
		let val = element.split("=")[1];
		parsed[key] = val;
	});
	if (parsed.size.includes("G")) {
		parsed.size = parseInt(parsed.size.replace("G", ""));
	}
	else if (parsed.size.includes("T")) {
		parsed.size = parseInt(parsed.size.replace("G", "")) * 1024;
	}
	else {
		parsed.size = 0;
	}
	
	return parsed;
}