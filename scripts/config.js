import {request, goToPage, getURIData} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	let uriData = getURIData();
	let node = uriData.node;
	let type = uriData.type;
	let vmid = uriData.vmid;
	await populateForm(node, type, vmid);

	let cancelButton = document.querySelector("#cancel");
	cancelButton.addEventListener("click", () => {
		goToPage("index.html");
	});

	/**
	 * Add disk qemu: POST config with sata4:"cephpl:4"
	 * Add disk lxc POST config with mp2:"cephpl:8,mp=/test/,backup=1"
	 */
}

async function populateForm (node, type, vmid) {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	let diskConfig = {
		lxc: {
			prefixOrder: ["mp"],
			mp: {name: "MP", limit: 255, used: {}}
		},
		qemu: {
			prefixOrder: ["sata", "ide"],
			ide: {name: "IDE", limit: 3, used: {}},
			sata: {name: "SATA", limit: 5, used: {}}
		}
	}

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

	let addDiskBus = document.querySelector("#add-disk #bus");
	diskConfig[type].prefixOrder.forEach(element => {
		addDiskBus.add(new Option(diskConfig[type][element].name, element));
	});
	let def = diskConfig[type].prefixOrder[0];
	addDiskBus.value = def;
	handleDiskBusChange(diskConfig);

	addDiskBus.addEventListener("change", handleDiskBusChange({c: diskConfig, t: type}));

	addDiskDevice.addEventListener("input", handleDiskDeviceChange({c: diskConfig, t: type}));
	addDiskDevice.addEventListener("focus", handleDiskDeviceChange({c: diskConfig, t: type}));

	let addDiskStorage = document.querySelector("#add-disk #storage");
	let addDiskSize = document.querySelector("#add-disk #size");

	console.log(diskConfig);
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

function handleDiskBusChange (data) {
	let diskConfig = data.c;
	let type = data.t;
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

function handleDiskDeviceChange (data) {
	let diskConfig = data.diskConfig;
	let type = data.type;
	let value = document.querySelector("#add-disk #device").value;
	let bus = document.querySelector("#add-disk #bus").value;
	let entry = diskConfig[type][bus];
	if(value in entry.used){
		addDiskDevice.style.border = "solid red 1px";
	}
	else {
		addDiskDevice.style.border = "solid white 1px";
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

	let config = document.createElement("img");
	config.src = "images/actions/config-active.svg";
	config.alt = `Config disk ${labelText}`;
	config.classList.add("clickable");
	field.append(config);
}