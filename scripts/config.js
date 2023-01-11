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
			prefixOrder: ["ide", "sata"],
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
		Object.keys(config.data).forEach(element => {
			if (element.startsWith(prefix)) {
				entry.used[element.replace(prefix, "")] = config.data[element];
			}
		});
		let ordered_keys = Object.keys(entry.used).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
		ordered_keys.forEach(element => {
			addDiskLine("disks", `${prefix}${element}`, entry.used[element].includes("media=cdrom") ? "images/resources/disk.svg" : "images/resources/drive.svg", `${entry} ${element}`, entry.used[element]);
		});
	}

	let addDiskBus = document.querySelector("#add-disk #bus");
	Object.keys(diskConfig[type]).forEach(element => {
		addDiskBus.add(new Option(diskConfig[type][element].name, element));
	});
	let def = Object.keys(diskConfig[type])[0];
	addDiskBus.value = def;
	let addDiskDevice = document.querySelector("#add-disk #device");
	addDiskDevice.max = diskConfig[type][def].limit;

	addDiskBus.addEventListener("change", () => {
		let value = document.querySelector("#add-disk #bus").value;
		document.querySelector("#add-disk #device").max =  diskConfig[type][value].limit
	});

	let addDiskStorage = document.querySelector("#add-disk #storage");
	let addDiskSize = document.querySelector("#add-disk #size");

	console.log(diskConfig);
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
	field.append(config);
}