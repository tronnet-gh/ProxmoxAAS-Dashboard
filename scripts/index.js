import {requestPVE, requestAPI, goToPage} from "./utils.js";
import {Dialog} from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}
	
	await populateInstances();

	let addInstanceBtn = document.querySelector("#instance-add");
	addInstanceBtn.addEventListener("click", handleInstanceAdd);
}

async function populateInstances () {
	let resources = await requestPVE("/cluster/resources", "GET", null);
	let instanceContainer = document.getElementById("instance-container");
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

	instanceContainer.innerHTML = `
		<div class="w3-row w3-hide-small w3-border-bottom w3-border-black">
			<div class="w3-col l1 m2">
				<p>VM ID</p>
			</div>
			<div class="w3-col l2 m3">
				<p>VM Name</p>
			</div>
			<div class="w3-col l1 m2">
				<p>VM Type</p>
			</div>
			<div class="w3-col l2 m3">
				<p>VM Status</p>
			</div>
			<div class="w3-col l2 w3-hide-medium">
				<p>Host Name</p>
			</div>
			<div class="w3-col l2 w3-hide-medium">
				<p>Host Status</p>
			</div>
			<div class="w3-col l2 m2">
				<p>Actions</p>
			</div>
		</div>
	`;
	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-obj");
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
		<select class="w3-select w3-border" name="type" id="type" required>
			<option value="lxc">Container</option>
			<option value="qemu">Virtual Machine</option>
		</select>
		<label for="node">Node</label>
		<select class="w3-select w3-border" name="node" id="node" required></select>
		<label for="name">Name</label>
		<input class="w3-input w3-border" name="name" id="name" required></input>
		<label for="vmid">ID</label>
		<input class="w3-input w3-border" name="vmid" id="vmid" type="number" required></input>
		<label for="cores">Cores (Threads)</label>
		<input class="w3-input w3-border" name="cores" id="cores" type="number" min="1" max="8192" required></input>
		<label for="memory">Memory (MiB)</label>
		<input class="w3-input w3-border" name="memory" id="memory" type="number" min="16", step="1" required></input>
		<p class="container-specific none" style="grid-column: 1 / span 2; text-align: center;">Container Options</p>
		<label class="container-specific none" for="swap">Swap (MiB)</label>
		<input class="w3-input w3-border container-specific none" name="swap" id="swap" type="number" min="0" step="1" required disabled></input>
		<label class="container-specific none" for="template-storage">Template Storage</label>
		<select class="w3-select w3-border container-specific none" name="template-storage" id="template-storage" required disabled></select>
		<label class="container-specific none" for="template-image">Template Image</label>
		<select class="w3-select w3-border container-specific none" name="template-image" id="template-image" required disabled></select>
		<label class="container-specific none" for="rootfs-storage">ROOTFS Storage</label>
		<select class="w3-select w3-border container-specific none" name="rootfs-storage" id="rootfs-storage" required disabled></select>				
		<label class="container-specific none" for="rootfs-size">ROOTFS Size (GiB)</label>
		<input class="w3-input w3-border container-specific none" name="rootfs-size" id="rootfs-size" type="number" min="0" max="131072" required disabled></input>
		<label class="container-specific none" for="password">Password</label>
		<input class="w3-input w3-border container-specific none" name="password" id="password" type="password" required disabled></input>
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

	let templateImage = dialog.shadowRoot.querySelector("#template-image"); // populate templateImage by 
	templateStorage.addEventListener("change", async () => {
		let content = "vztmpl";
		let images = await requestPVE(`/nodes/${nodeSelect.value}/storage/${templateStorage.value}/content`, "GET");
		images.data.forEach((element) => {
			if (element.content.includes(content)) {
				templateImage.append(new Option(element.volid.replace(`${templateStorage.value}:${content}/`, ""), element.volid));
			}
		});
		templateImage.selectedIndex = -1;
	});
	
	dialog.callback = async (result, form) => {
		if (result === "confirm") {
			let body = {
				node: form.get("node"),
				type: form.get("type"),
				name: form.get("name"),
				vmid: form.get("vmid"),
				cores: form.get("cores"),
				memory: form.get("memory")
			};
			if (form.get("type") === "lxc") {
				body.swap = form.get("swap");
				body.password = form.get("password");
				body.ostemplate = form.get("template-image");
				body.rootfslocation = form.get("rootfs-storage");
				body.rootfssize = form.get("rootfs-size");
			}
			let result = await requestAPI("/instance", "POST", body);
			if (result.status === 200) {
				populateInstances();
			}
			else {
				console.error(result);
				populateInstances();
			}
		}
	}

	dialog.show();
}