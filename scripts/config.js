import {request, goToPage, getURIData, reload} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

let diskConfig = {
	//actionBarOrder: ["config", "move", "reassign", "resize", "delete_detach_attach"],
	actionBarOrder: ["config", "move", "resize", "delete_detach_attach"], // handle reassign later
	lxc: {
		prefixOrder: ["rootfs", "mp", "unused"],
		rootfs: {name: "ROOTFS", icon: "images/resources/drive.svg", actions: ["move", "resize"]},
		mp: {name: "MP", icon: "images/resources/drive.svg", actions: ["config", "detach", "move", "reassign", "resize"]},
		unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
	},
	qemu: {
		prefixOrder: ["ide", "sata", "unused"],
		ide: {name: "IDE", icon: "images/resources/disk.svg", actions: ["config", "delete"]},
		sata: {name: "SATA", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"]},
		unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
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

	console.log(diskConfig);
}

async function populateResources () {
	let config = await request(`/nodes/${node}/${type}/${vmid}/config`);
	console.log(config);

	let name = type === "qemu" ? "name" : "hostname";
	document.querySelector("#name").innerText = config.data[name];
	addResourceLine("resources", "images/resources/cpu.svg", "Cores", {type: "number", value: config.data.cores, min: 1, max: 8192}, "Threads"); // TODO add max from quota API
	addResourceLine("resources", "images/resources/ram.svg", "Memory", {type: "number", value: config.data.memory, min: 16, step: 1}, "MiB"); // TODO add max from quota API
	
	if (type === "lxc") {
		addResourceLine("resources", "images/resources/swap.svg", "Swap", {type: "number", value: config.data.swap, min: 0, step: 1}, "MiB"); // TODO add max from quota API
	}

	for(let i = 0; i < diskConfig[type].prefixOrder.length; i++){
		let prefix = diskConfig[type].prefixOrder[i];
		let busName = diskConfig[type][prefix].name;
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

async function addDiskLine (fieldset, busPrefix, busName, device, disk) {
	let field = document.querySelector(`#${fieldset}`);
	
	// Set the disk icon, either drive.svg or disk.svg
	let icon = document.createElement("img");
	icon.src = diskConfig[type][busPrefix].icon;
	icon.alt = `${busName} ${device}`;
	field.append(icon);

	// Add a label for the disk bus and device number
	let diskLabel = document.createElement("label");
	diskLabel.innerHTML = `${busName} ${device}`;
	field.append(diskLabel);

	// Add text of the disk configuration
	let diskDesc = document.createElement("p");
	diskDesc.innerText = disk;
	field.append(diskDesc);

	let actionDiv = document.createElement("div");
	actionDiv.classList.add("last-item");
	diskConfig.actionBarOrder.forEach((element) => {
		let action = document.createElement("img");
		action.classList.add("clickable");
		if (element === "delete_detach_attach" && diskConfig[type][busPrefix].actions.includes("attach")){
			action.src = "images/actions/attach.svg";
			action.title = "Attach Disk";
		}
		else if (element === "delete_detach_attach" && diskConfig[type][busPrefix].actions.includes("detach")){
			action.src = "images/actions/detach.svg";
			action.title = "Detach Disk";
		}
		else if (element === "delete_detach_attach"){
			let active = diskConfig[type][busPrefix].actions.includes("delete") ? "active" : "inactive";
			action.src = `images/actions/delete-${active}.svg`;
			action.title = `Delete Disk`;
		}
		else {
			let active = diskConfig[type][busPrefix].actions.includes(element) ? "active" : "inactive";
			action.src = `images/actions/${element}-${active}.svg`;
			action.title = `${element.charAt(0).toUpperCase()}${element.slice(1)} Disk`;
		}
		action.id = `${busPrefix}${device}`
		actionDiv.append(action);
	});
	field.append(actionDiv);
}

function getOrderedUsed(disks){
	let ordered_keys = Object.keys(disks).sort((a,b) => {parseInt(a) - parseInt(b)}); // ordered integer list
	return ordered_keys;
}