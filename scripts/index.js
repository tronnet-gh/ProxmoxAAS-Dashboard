import { requestPVE, requestAPI, goToPage, goToURL, instancesConfig, nodesConfig, setTitleAndHeader } from "./utils.js";
import { alert, dialog } from "./dialog.js";
import { PVE } from "../vars.js";
import { setupClientSync } from "./clientsync.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	const addInstanceBtn = document.querySelector("#instance-add");
	addInstanceBtn.addEventListener("click", handleInstanceAdd);

	setupClientSync(populateInstances);
}

async function populateInstances () {
	const resources = await requestPVE("/cluster/resources", "GET");
	const instanceContainer = document.getElementById("instance-container");
	const instances = [];

	resources.data.forEach((element) => {
		if (element.type === "lxc" || element.type === "qemu") {
			const nodeName = element.node;
			const nodeStatus = resources.data.find(item => item.node === nodeName && item.type === "node").status;
			element.node = { name: nodeName, status: nodeStatus };
			instances.push(element);
		}
	});

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	instanceContainer.innerHTML = `
		<div class="w3-row w3-hide-small" style="border-bottom: 1px solid;">
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
	for (let i = 0; i < instances.length; i++) {
		const newInstance = new Instance();
		newInstance.data = instances[i];
		instanceContainer.append(newInstance.shadowElement);
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
			const result = await requestAPI(`/${node}/${type}/${vmid}/create`, "POST", body);
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
	d.querySelector("#cores").max = userResources.avail.cores;
	d.querySelector("#memory").max = userResources.avail.memory;
	d.querySelector("#vmid").min = userCluster.vmid.min;
	d.querySelector("#vmid").max = userCluster.vmid.max;
}

class Instance {
	constructor () {
		const shadowRoot = document.createElement("div");
		shadowRoot.classList.add("w3-row");

		shadowRoot.innerHTML = `
			<div class="w3-col l1 m2 s6">
				<p id="instance-id"></p>
			</div>
			<div class="w3-col l2 m3 s6">
				<p id="instance-name"></p>
			</div>
			<div class="w3-col l1 m2 w3-hide-small">
				<p id="instance-type"></p>
			</div>
			<div class="w3-col l2 m3 s6 flex row nowrap">
				<img id="instance-status-icon">
				<p id="instance-status"></p>
			</div>
			<div class="w3-col l2 w3-hide-medium w3-hide-small">
				<p id="node-name"></p>
			</div>
			<div class="w3-col l2 w3-hide-medium w3-hide-small flex row nowrap">
				<img id="node-status-icon">
				<p id="node-status"></p>
			</div>
			<div class="w3-col l2 m2 s6 flex row nowrap" style="height: 1lh; margin-top: 15px; margin-bottom: 15px;">
				<img id="power-btn">
				<img id="console-btn">
				<img id="configure-btn">
				<img id="delete-btn">
			</div>
		`;

		this.shadowElement = shadowRoot;
		this.actionLock = false;
	}

	get data () {
		return {
			type: this.type,
			status: this.status,
			vmid: this.status,
			name: this.name,
			node: this.node
		};
	}

	set data (data) {
		if (data.status === "unknown") {
			data.status = "stopped";
		}
		this.type = data.type;
		this.status = data.status;
		this.vmid = data.vmid;
		this.name = data.name;
		this.node = data.node;
		this.update();
	}

	update () {
		const vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = this.vmid;

		const nameParagraph = this.shadowElement.querySelector("#instance-name");
		nameParagraph.innerText = this.name ? this.name : "";

		const typeParagraph = this.shadowElement.querySelector("#instance-type");
		typeParagraph.innerText = this.type;

		const statusParagraph = this.shadowElement.querySelector("#instance-status");
		statusParagraph.innerText = this.status;

		const statusIcon = this.shadowElement.querySelector("#instance-status-icon");
		statusIcon.src = instancesConfig[this.status].status.src;
		statusIcon.alt = instancesConfig[this.status].status.alt;

		const nodeNameParagraph = this.shadowElement.querySelector("#node-name");
		nodeNameParagraph.innerText = this.node.name;

		const nodeStatusParagraph = this.shadowElement.querySelector("#node-status");
		nodeStatusParagraph.innerText = this.node.status;

		const nodeStatusIcon = this.shadowElement.querySelector("#node-status-icon");
		nodeStatusIcon.src = nodesConfig[this.node.status].status.src;
		nodeStatusIcon.alt = nodesConfig[this.node.status].status.src;

		const powerButton = this.shadowElement.querySelector("#power-btn");
		powerButton.src = instancesConfig[this.status].power.src;
		powerButton.alt = instancesConfig[this.status].power.alt;
		powerButton.title = instancesConfig[this.status].power.alt;
		if (instancesConfig[this.status].power.clickable) {
			powerButton.classList.add("clickable");
			powerButton.onclick = this.handlePowerButton.bind(this);
		}

		const configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = instancesConfig[this.status].config.src;
		configButton.alt = instancesConfig[this.status].config.alt;
		configButton.title = instancesConfig[this.status].config.alt;
		if (instancesConfig[this.status].config.clickable) {
			configButton.classList.add("clickable");
			configButton.onclick = this.handleConfigButton.bind(this);
		}

		const consoleButton = this.shadowElement.querySelector("#console-btn");
		consoleButton.src = instancesConfig[this.status].console.src;
		consoleButton.alt = instancesConfig[this.status].console.alt;
		consoleButton.title = instancesConfig[this.status].console.alt;
		if (instancesConfig[this.status].console.clickable) {
			consoleButton.classList.add("clickable");
			consoleButton.onclick = this.handleConsoleButton.bind(this);
		}

		const deleteButton = this.shadowElement.querySelector("#delete-btn");
		deleteButton.src = instancesConfig[this.status].delete.src;
		deleteButton.alt = instancesConfig[this.status].delete.alt;
		deleteButton.title = instancesConfig[this.status].delete.alt;
		if (instancesConfig[this.status].delete.clickable) {
			deleteButton.classList.add("clickable");
			deleteButton.onclick = this.handleDeleteButton.bind(this);
		}

		if (this.node.status !== "online") {
			powerButton.classList.add("hidden");
			configButton.classList.add("hidden");
			consoleButton.classList.add("hidden");
			deleteButton.classList.add("hidden");
		}
	}

	async handlePowerButton () {
		if (!this.actionLock) {
			const header = `${this.status === "running" ? "Stop" : "Start"} VM ${this.vmid}`;
			const body = `<p>Are you sure you want to ${this.status === "running" ? "stop" : "start"} VM</p><p>${this.vmid}</p>`;

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					const targetAction = this.status === "running" ? "stop" : "start";
					const targetStatus = this.status === "running" ? "stopped" : "running";
					const prevStatus = this.status;
					this.status = "loading";

					this.update();

					const result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", { node: this.node.name, vmid: this.vmid });

					const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

					while (true) {
						const taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`, "GET");
						if (taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
							this.status = targetStatus;
							this.update();
							this.actionLock = false;
							break;
						}
						else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
							this.status = prevStatus;
							alert(`attempted to ${targetAction} ${this.vmid} but process returned stopped:${result.data.exitstatus}`);
							this.update();
							this.actionLock = false;
							break;
						}
						else { // task has not stopped
							await waitFor(1000);
						}
					}
				}
			});
		}
	}

	handleConfigButton () {
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the conig page with the node infor in the search query
			goToPage("config.html", { node: this.node.name, type: this.type, vmid: this.vmid });
		}
	}

	handleConsoleButton () {
		if (!this.actionLock && this.status === "running") {
			const data = { console: `${this.type === "qemu" ? "kvm" : "lxc"}`, vmid: this.vmid, vmname: this.name, node: this.node.name, resize: "off", cmd: "" };
			data[`${this.type === "qemu" ? "novnc" : "xtermjs"}`] = 1;
			goToURL(PVE, data, true);
		}
	}

	handleDeleteButton () {
		if (!this.actionLock && this.status === "stopped") {
			const header = `Delete VM ${this.vmid}`;
			const body = `<p>Are you sure you want to <strong>delete</strong> VM </p><p>${this.vmid}</p>`;

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					this.status = "loading";
					this.update();

					const action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					const result = await requestAPI(`/${this.node.name}/${this.type}/${this.vmid}/delete`, "DELETE");
					if (result.status === 200) {
						this.shadowElement.parentElement.removeChild(this.shadowElement);
					}
					else {
						alert(result.error);
						this.status = this.prevStatus;
						this.update();
						this.actionLock = false;
					}
				}
			});
		}
	}
}
