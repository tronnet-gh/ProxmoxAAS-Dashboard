import {requestPVE, goToPage, deleteAllCookies} from "./utils.js";
import { Dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	await populateInstances();

	let instances = document.querySelector("nav #instances");
	instances.addEventListener("click", () => {
		goToPage("index.html");
	});

	let logout = document.querySelector("nav #logout");
	logout.addEventListener("click", () => {
		deleteAllCookies();
		goToPage("login.html");
	});

	let addInstanceBtn = document.querySelector("#instance-add");
	addInstanceBtn.addEventListener("click", handleInstanceAdd);
}

async function populateInstances () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let resources = await requestPVE("/cluster/resources", "GET", null);

	let instanceContainer = document.getElementById("instance-container")

	let instances = [];

	resources.data.forEach((element) => {
		if (element.type === "lxc" || element.type === "qemu") {
			let nodeName = element.node;
			let nodeStatus = resources.data.find(item => item.node === nodeName && item.type === "node").status;
			element.node = {name: nodeName, status: nodeStatus};
			instances.push(element);
		}
	});

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	instanceContainer.innerText = "";
	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-article");
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}

async function handleInstanceAdd () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);
	
	dialog.header = "Create New Instance";

	dialog.formBody = `
		<label for="type">Instance Type</label>
		<select name="type" id="type" required>
			<option value="lxc">Container</option>
			<option value="qemu">Virtual Machine</option>
		</select>
		<label for="node">Node</label>
		<select name="node" id="node" required></select>
		<label for="name">Name</label>
		<input name="name" id="name" required></input>
		<label for="vmid">ID</label>
		<input name="vmid" id="vmid" type="number" required></input>
		<label for="cpu">Cores (Threads)</label>
		<input name="cpu" id="cpu" type="number" min="1" max="8192" required></input>
		<label for="ram">Memory (MiB)</label>
		<input name="ram" id="ram" type="number" min="16", step="1" required></input>
		<p class="container-specific none" style="grid-column: 1 / span 2; text-align: center;">Container Options</p>
		<label class="container-specific none" for="swap">Swap (MiB)</label>
		<input class="container-specific none" name="swap" id="swap" type="number" min="0" step="1" required disabled></input>
		<label class="container-specific none" for="template-storage">Template Storage</label>
		<select class="container-specific none" name="template-storage" id="template-storage" required disabled></select>
		<label class="container-specific none" for="template-image">Template Image</label>
		<select class="container-specific none" name="template-image" id="template-image" required disabled></select>
		<label class="container-specific none" for="rootfs-storage">ROOTFS Storage</label>
		<select class="container-specific none" name="rootfs-storage" id="rootfs-storage" required disabled></select>				
		<label class="container-specific none" for="rootfs-size">ROOTFS Size (GiB)</label>
		<input class="container-specific none" name="rootfs-size" id="rootfs-size" type="number" min="0" max="131072" required disabled></input>
	`;

	let typeSelect = dialog.shadowRoot.querySelector("#type");
	typeSelect.selectedIndex = -1;
	typeSelect.addEventListener("change", () => {
		if(typeSelect.value === "qemu") {
			dialog.shadowRoot.querySelectorAll(".container-specific").forEach((element) => {
				element.classList.add("none");
				element.disabled = true;
			});
		}
		else {
			dialog.shadowRoot.querySelectorAll(".container-specific").forEach((element) => {
				element.classList.remove("none");
				element.disabled = false;
			});
		}
	});

	let templateContent = "iso";
	let templateStorage = dialog.shadowRoot.querySelector("#template-storage");
	templateStorage.selectedIndex = -1;

	let rootfsContent = "rootdir";
	let rootfsStorage = dialog.shadowRoot.querySelector("#rootfs-storage");
	rootfsStorage.selectedIndex = -1;

	let nodeSelect = dialog.shadowRoot.querySelector("#node");
	let nodes = await requestPVE("/nodes", "GET");
	nodes.data.forEach((element) => {
		if (element.status === "online") {
			nodeSelect.add(new Option(element.node));
		}
	});
	nodeSelect.selectedIndex = -1;
	nodeSelect.addEventListener("change", async () => { // change template and rootfs storage based on node
		let node = nodeSelect.value;
		let storage = await requestPVE(`/nodes/${node}/storage`, "GET");
		storage.data.forEach((element) => {
			if (element.content.includes(templateContent)) {
				templateStorage.add(new Option(element.storage));
			}
			if (element.content.includes(rootfsContent)) {
				rootfsStorage.add(new Option(element.storage));
			}
		});
		templateStorage.selectedIndex = -1;
		rootfsStorage.selectedIndex = -1;
	});

	let vmidInput = dialog.shadowRoot.querySelector("#vmid"); // suggest min and max based on user restrictions

	let templateImage = dialog.shadowRoot.querySelector("#template-image"); // populate templateImage by 
	
	dialog.callback = async (result, form) => {
		if (result === "confirm") {

		}
	}

	dialog.show();
}