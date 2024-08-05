import { requestPVE, requestAPI, goToPage, setTitleAndHeader, setAppearance, getSearchSettings, goToURL, instancesConfig, nodesConfig, setSVGSrc, setSVGAlt } from "./utils.js";
import { alert, dialog } from "./dialog.js";
import { setupClientSync } from "./clientsync.js";
import wfAlign from "../modules/wfa.js";
import { PVE } from "../vars.js";

class InstanceCard extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<style>
				* {
					margin: 0;
				}
			</style>
			<div class="w3-row" style="margin-top: 1em; margin-bottom: 1em;">
				<hr class="w3-show-small w3-hide-medium w3-hide-large" style="margin: 0; margin-bottom: 1em;">
				<p class="w3-col l1 m2 s6" id="instance-id"></p>
				<p class="w3-col l2 m3 s6" id="instance-name"></p>
				<p class="w3-col l1 m2 w3-hide-small" id="instance-type"></p>
				<div class="w3-col l2 m3 s6 flex row nowrap">
					<svg id="instance-status-icon"></svg>
					<p id="instance-status"></p>
				</div>
				<p class="w3-col l2 w3-hide-medium w3-hide-small" id="node-name"></p>
				<div class="w3-col l2 w3-hide-medium w3-hide-small flex row nowrap">
					<svg id="node-status-icon"></svg>
					<p id="node-status"></p>
				</div>
				<div class="w3-col l2 m2 s6 flex row nowrap" style="height: 1lh;">
					<svg id="power-btn" tabindex="0" role="button"></svg>
					<svg id="console-btn" tabindex="0" role="button"></svg>
					<svg id="configure-btn" tabindex="0" role="button"></svg>
					<svg id="delete-btn" tabindex="0" role="button"></svg>
				</div>
			</div>
		`;
		this.actionLock = false;
	}

	get data () {
		return {
			type: this.type,
			status: this.status,
			vmid: this.status,
			name: this.name,
			node: this.node,
			searchQuery: this.searchQuery
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
		this.searchQuery = data.searchQuery;
		this.update();
	}

	update () {
		const vmidParagraph = this.shadowRoot.querySelector("#instance-id");
		vmidParagraph.innerText = this.vmid;

		const nameParagraph = this.shadowRoot.querySelector("#instance-name");
		if (this.searchQuery) {
			const regExpEscape = v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const escapedQuery = regExpEscape(this.searchQuery);
			const searchRegExp = new RegExp(`(${escapedQuery})`, "gi");
			const nameParts = this.name.split(searchRegExp);
			for (let i = 0; i < nameParts.length; i++) {
				const part = document.createElement("span");
				part.innerText = nameParts[i];
				if (nameParts[i].toLowerCase() === this.searchQuery.toLowerCase()) {
					part.style = "color: var(--lightbg-text-color); background-color: var(--highlight-color);";
				}
				nameParagraph.append(part);
			}
		}
		else {
			nameParagraph.innerHTML = this.name ? this.name : "&nbsp;";
		}

		const typeParagraph = this.shadowRoot.querySelector("#instance-type");
		typeParagraph.innerText = this.type;

		const statusParagraph = this.shadowRoot.querySelector("#instance-status");
		statusParagraph.innerText = this.status;

		const statusIcon = this.shadowRoot.querySelector("#instance-status-icon");
		setSVGSrc(statusIcon, instancesConfig[this.status].status.src);
		setSVGAlt(statusIcon, instancesConfig[this.status].status.alt);

		const nodeNameParagraph = this.shadowRoot.querySelector("#node-name");
		nodeNameParagraph.innerText = this.node.name;

		const nodeStatusParagraph = this.shadowRoot.querySelector("#node-status");
		nodeStatusParagraph.innerText = this.node.status;

		const nodeStatusIcon = this.shadowRoot.querySelector("#node-status-icon");
		setSVGSrc(nodeStatusIcon, nodesConfig[this.node.status].status.src);
		setSVGAlt(nodeStatusIcon, nodesConfig[this.node.status].status.alt);

		const powerButton = this.shadowRoot.querySelector("#power-btn");
		setSVGSrc(powerButton, instancesConfig[this.status].power.src);
		setSVGAlt(powerButton, instancesConfig[this.status].power.alt);
		if (instancesConfig[this.status].power.clickable) {
			powerButton.classList.add("clickable");
			powerButton.onclick = this.handlePowerButton.bind(this);
		}

		const configButton = this.shadowRoot.querySelector("#configure-btn");
		setSVGSrc(configButton, instancesConfig[this.status].config.src);
		setSVGAlt(configButton, instancesConfig[this.status].config.alt);
		if (instancesConfig[this.status].config.clickable) {
			configButton.classList.add("clickable");
			configButton.onclick = this.handleConfigButton.bind(this);
		}

		const consoleButton = this.shadowRoot.querySelector("#console-btn");
		setSVGSrc(consoleButton, instancesConfig[this.status].console.src);
		setSVGAlt(consoleButton, instancesConfig[this.status].console.alt);
		if (instancesConfig[this.status].console.clickable) {
			consoleButton.classList.add("clickable");
			consoleButton.onclick = this.handleConsoleButton.bind(this);
		}

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		setSVGSrc(deleteButton, instancesConfig[this.status].delete.src);
		setSVGAlt(deleteButton, instancesConfig[this.status].delete.alt);
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
			const body = `<p>Are you sure you want to ${this.status === "running" ? "stop" : "start"} VM ${this.vmid}</p>`;

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
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the config page with the node info in the search query
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
			const body = `<p>Are you sure you want to <strong>delete</strong> VM ${this.vmid}</p>`;

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					this.status = "loading";
					this.update();

					const action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					const result = await requestAPI(`/cluster/${this.node.name}/${this.type}/${this.vmid}/delete`, "DELETE");
					if (result.status === 200) {
						if (this.parentElement) {
							this.parentElement.removeChild(this);
						}
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

customElements.define("instance-card", InstanceCard);

window.addEventListener("DOMContentLoaded", init);

let instances = [];

async function init () {
	setAppearance();
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
	const searchCriteria = getSearchSettings();
	const searchQuery = document.querySelector("#search").value || null;
	let criteria;
	if (!searchQuery) {
		criteria = (a, b) => {
			return (a.vmid > b.vmid) ? 1 : -1;
		};
	}
	else if (searchCriteria === "exact") {
		criteria = (a, b) => {
			const aInc = a.name.toLowerCase().includes(searchQuery.toLowerCase());
			const bInc = b.name.toLowerCase().includes(searchQuery.toLowerCase());
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
	else if (searchCriteria === "fuzzy") {
		const penalties = {
			m: 0,
			x: 1,
			o: 1,
			e: 1
		};
		criteria = (a, b) => {
			// lower is better
			const aAlign = wfAlign(a.name.toLowerCase(), searchQuery.toLowerCase(), penalties);
			const aScore = aAlign.score / a.name.length;
			const bAlign = wfAlign(b.name.toLowerCase(), searchQuery.toLowerCase(), penalties);
			const bScore = bAlign.score / b.name.length;
			if (aScore === bScore) {
				return a.vmid > b.vmid ? 1 : -1;
			}
			else {
				return aScore - bScore;
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
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="type">Instance Type</label>
			<select class="w3-select w3-border" name="type" id="type" required>
				<option value="lxc">Container</option>
				<option value="qemu">Virtual Machine</option>
			</select>
			<label for="node">Node</label>
			<select class="w3-select w3-border" name="node" id="node" required></select>
			<label for="name">Name</label>
			<input class="w3-input w3-border" name="name" id="name" required>
			<label for="vmid">ID</label>
			<input class="w3-input w3-border" name="vmid" id="vmid" type="number" required>
			<label for="pool">Pool</label>
			<select class="w3-select w3-border" name="pool" id="pool" required></select>
			<label for="cores">Cores (Threads)</label>
			<input class="w3-input w3-border" name="cores" id="cores" type="number" min="1" max="8192" required>
			<label for="memory">Memory (MiB)</label>
			<input class="w3-input w3-border" name="memory" id="memory" type="number" min="16", step="1" required>
			<p class="container-specific none" style="grid-column: 1 / span 2; text-align: center;">Container Options</p>
			<label class="container-specific none" for="swap">Swap (MiB)</label>
			<input class="w3-input w3-border container-specific none" name="swap" id="swap" type="number" min="0" step="1" required disabled>
			<label class="container-specific none" for="template-image">Template Image</label>
			<select class="w3-select w3-border container-specific none" name="template-image" id="template-image" required disabled></select>
			<label class="container-specific none" for="rootfs-storage">ROOTFS Storage</label>
			<select class="w3-select w3-border container-specific none" name="rootfs-storage" id="rootfs-storage" required disabled></select>
			<label class="container-specific none" for="rootfs-size">ROOTFS Size (GiB)</label>
			<input class="w3-input w3-border container-specific none" name="rootfs-size" id="rootfs-size" type="number" min="0" max="131072" required disabled>
			<label class="container-specific none" for="password">Password</label>
			<input class="w3-input w3-border container-specific none" name="password" id="password" type="password" required disabled>
			<label for="confirm-password">Confirm Password</label>
			<input class="w3-input w3-border container-specific none" name="confirm-password" id="confirm-password" type="password" required disabled>
		</form>
	`;

	const templates = await requestAPI("/user/ct-templates", "GET");

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const body = {
				name: form.get("name"),
				cores: form.get("cores"),
				memory: form.get("memory"),
				pool: form.get("pool")
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

	const rootfsContent = "rootdir";
	const rootfsStorage = d.querySelector("#rootfs-storage");
	rootfsStorage.selectedIndex = -1;

	const userResources = await requestAPI("/user/dynamic/resources", "GET");
	const userCluster = await requestAPI("/user/config/cluster", "GET");

	const nodeSelect = d.querySelector("#node");
	const clusterNodes = await requestPVE("/nodes", "GET");
	const allowedNodes = Object.keys(userCluster.nodes);
	clusterNodes.data.forEach((element) => {
		if (element.status === "online" && allowedNodes.includes(element.node)) {
			nodeSelect.add(new Option(element.node));
		}
	});
	nodeSelect.selectedIndex = -1;
	nodeSelect.addEventListener("change", async () => { // change rootfs storage based on node
		const node = nodeSelect.value;
		const storage = await requestPVE(`/nodes/${node}/storage`, "GET");
		storage.data.forEach((element) => {
			if (element.content.includes(rootfsContent)) {
				rootfsStorage.add(new Option(element.storage));
			}
		});
		rootfsStorage.selectedIndex = -1;

		// set core and memory min/max depending on node selected
		if (node in userResources.cores.nodes) {
			d.querySelector("#cores").max = userResources.cores.nodes[node].avail;
		}
		else {
			d.querySelector("#cores").max = userResources.cores.global.avail;
		}

		if (node in userResources.memory.nodes) {
			d.querySelector("#memory").max = userResources.memory.nodes[node].avail;
		}
		else {
			d.querySelector("#memory").max = userResources.memory.global.avail;
		}
	});

	// set vmid min/max
	d.querySelector("#vmid").min = userCluster.vmid.min;
	d.querySelector("#vmid").max = userCluster.vmid.max;

	// add user pools to selector
	const poolSelect = d.querySelector("#pool");
	const userPools = Object.keys(userCluster.pools);
	userPools.forEach((element) => {
		poolSelect.add(new Option(element));
	});
	poolSelect.selectedIndex = -1;

	// add template images to selector
	const templateImage = d.querySelector("#template-image"); // populate templateImage depending on selected image storage
	for (const template of templates) {
		templateImage.append(new Option(template.name, template.volid));
	}
	templateImage.selectedIndex = -1;

	const password = d.querySelector("#password");
	const confirmPassword = d.querySelector("#confirm-password");

	function validatePassword () {
		confirmPassword.setCustomValidity(password.value !== confirmPassword.value ? "Passwords Don't Match" : "");
	}

	password.addEventListener("change", validatePassword);
	confirmPassword.addEventListener("keyup", validatePassword);
}
