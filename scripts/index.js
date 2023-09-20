import { requestPVE, requestAPI, goToPage, setTitleAndHeader } from "./utils.js";
import { alert, dialog } from "./dialog.js";
import { setupClientSync } from "./clientsync.js";

window.addEventListener("DOMContentLoaded", init);

let instances = [];

async function init () {
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	document.querySelector("#instance-add").addEventListener("click", handleInstanceAdd);
	document.querySelector("#vm-search").addEventListener("input", populateInstances);

	setupClientSync(refreshInstances);
}

async function refreshInstances () {
	await getInstances();
	await populateInstances();
}

async function getInstances () {
	const resources = await requestPVE("/cluster/resources", "GET");
	instances = [];
	resources.data.forEach((element) => {
		if (element.type === "lxc" || element.type === "qemu") {
			const nodeName = element.node;
			const nodeStatus = resources.data.find(item => item.node === nodeName && item.type === "node").status;
			element.node = { name: nodeName, status: nodeStatus };
			instances.push(element);
		}
	});
}

async function populateInstances () {
	const searchQuery = document.querySelector("#search").value || null;
	let criteria;
	if (!searchQuery) {
		criteria = (a, b) => {
			return (a.vmid > b.vmid) ? 1 : -1;
		};
	}
	else {
		criteria = (a, b) => {
			const aInc = a.name.includes(searchQuery);
			const bInc = b.name.includes(searchQuery);
			if (aInc && bInc) {
				return a.vmid > b.vmid ? 1 : -1;
			}
			else if (aInc && !bInc) {
				return -1;
			}
			else if (!aInc && bInc) {
				return 1;
			}
			else {
				return a.vmid > b.vmid ? 1 : -1;
			}
		};
	}
	instances.sort(criteria);
	const instanceContainer = document.querySelector("#instance-container");
	instanceContainer.innerHTML = "";
	for (let i = 0; i < instances.length; i++) {
		const newInstance = document.createElement("instance-card");
		instances[i].searchQuery = searchQuery;
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}

async function handleInstanceAdd () {
	const header = "Create New Instance";

	const body = `
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

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				name: form.get("name"),
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
			const node = form.get("node");
			const type = form.get("type");
			const vmid = form.get("vmid");
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/create`, "POST", body);
			if (result.status === 200) {
				populateInstances();
			}
			else {
				alert(result.error);
				populateInstances();
			}
		}
	});

	const typeSelect = d.querySelector("#type");
	typeSelect.selectedIndex = -1;
	typeSelect.addEventListener("change", () => {
		if (typeSelect.value === "qemu") {
			d.querySelectorAll(".container-specific").forEach((element) => {
				element.classList.add("none");
				element.disabled = true;
			});
		}
		else {
			d.querySelectorAll(".container-specific").forEach((element) => {
				element.classList.remove("none");
				element.disabled = false;
			});
		}
	});

	const templateContent = "iso";
	const templateStorage = d.querySelector("#template-storage");
	templateStorage.selectedIndex = -1;

	const rootfsContent = "rootdir";
	const rootfsStorage = d.querySelector("#rootfs-storage");
	rootfsStorage.selectedIndex = -1;

	const nodeSelect = d.querySelector("#node");
	const clusterNodes = await requestPVE("/nodes", "GET");
	const allowedNodes = await requestAPI("/user/config/nodes", "GET");
	clusterNodes.data.forEach((element) => {
		if (element.status === "online" && allowedNodes.includes(element.node)) {
			nodeSelect.add(new Option(element.node));
		}
	});
	nodeSelect.selectedIndex = -1;
	nodeSelect.addEventListener("change", async () => { // change template and rootfs storage based on node
		const node = nodeSelect.value;
		const storage = await requestPVE(`/nodes/${node}/storage`, "GET");
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

	const templateImage = d.querySelector("#template-image"); // populate templateImage depending on selected image storage
	templateStorage.addEventListener("change", async () => {
		templateImage.innerHTML = "";
		const content = "vztmpl";
		const images = await requestPVE(`/nodes/${nodeSelect.value}/storage/${templateStorage.value}/content`, "GET");
		images.data.forEach((element) => {
			if (element.content.includes(content)) {
				templateImage.append(new Option(element.volid.replace(`${templateStorage.value}:${content}/`, ""), element.volid));
			}
		});
		templateImage.selectedIndex = -1;
	});

	const userResources = await requestAPI("/user/dynamic/resources", "GET");
	const userCluster = await requestAPI("/user/config/cluster", "GET");
	d.querySelector("#cores").max = userResources.cores.avail;
	d.querySelector("#memory").max = userResources.memory.avail;
	d.querySelector("#vmid").min = userCluster.vmid.min;
	d.querySelector("#vmid").max = userCluster.vmid.max;
}
