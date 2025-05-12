import { requestPVE, requestAPI, goToPage, setAppearance, getSearchSettings, goToURL, requestDash } from "./utils.js";
import { alert, dialog } from "./dialog.js";
import { setupClientSync } from "./clientsync.js";
import wfaInit from "../modules/wfa.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();

	wfaInit("modules/wfa.wasm");
	initInstances();

	document.querySelector("#instance-add").addEventListener("click", handleInstanceAdd);
	document.querySelector("#vm-search").addEventListener("input", sortInstances);

	setupClientSync(refreshInstances);
}

class InstanceCard extends HTMLElement {
	actionLock = false;
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		this.actionLock = false;
	}

	get type () {
		return this.dataset.type;
	}

	set type (type) {
		this.dataset.type = type;
	}

	get status () {
		return this.dataset.status;
	}

	set status (status) {
		this.dataset.status = status;
	}

	get vmid () {
		return this.dataset.vmid;
	}

	set vmid (vmid) {
		this.dataset.vmid = vmid;
	}

	get name () {
		return this.dataset.name;
	}

	set name (name) {
		this.dataset.name = name;
	}

	get node () {
		return {
			name: this.dataset.node,
			status: this.dataset.nodestatus
		};
	}

	set node (node) {
		this.dataset.node = node.name;
		this.dataset.nodetsatus = node.status;
	}

	set searchQueryResult (result) {
		this.dataset.searchqueryresult = JSON.stringify(result);
	}

	get searchQueryResult () {
		return JSON.parse(!this.dataset.searchqueryresult ? "{}" : this.dataset.searchqueryresult);
	}

	update () {
		const nameParagraph = this.shadowRoot.querySelector("#instance-name");
		nameParagraph.innerText = "";
		if (this.searchQueryResult.alignment) {
			let i = 0; // name index
			let c = 0; // alignment index
			const alignment = this.searchQueryResult.alignment;
			while (i < this.name.length && c < alignment.length) {
				if (alignment[c] === "M") {
					const part = document.createElement("span");
					part.innerText = this.name[i];
					part.style = "color: var(--lightbg-text-color); background-color: var(--highlight-color);";
					nameParagraph.append(part);
					i++;
					c++;
				}
				else if (alignment[c] === "I") {
					const part = document.createElement("span");
					part.innerText = this.name[i];
					nameParagraph.append(part);
					i++;
					c++;
				}
				else if (alignment[c] === "D") {
					c++;
				}
				else if (alignment[c] === "X") {
					const part = document.createElement("span");
					part.innerText = this.name[i];
					nameParagraph.append(part);
					i++;
					c++;
				}
			}
		}
		else {
			nameParagraph.innerHTML = this.name ? this.name : "&nbsp;";
		}

		const powerButton = this.shadowRoot.querySelector("#power-btn");
		if (powerButton.classList.contains("clickable")) {
			powerButton.onclick = this.handlePowerButton.bind(this);
		}

		const configButton = this.shadowRoot.querySelector("#configure-btn");
		if (configButton.classList.contains("clickable")) {
			configButton.onclick = this.handleConfigButton.bind(this);
		}

		const consoleButton = this.shadowRoot.querySelector("#console-btn");
		if (consoleButton.classList.contains("clickable")) {
			consoleButton.classList.add("clickable");
			consoleButton.onclick = this.handleConsoleButton.bind(this);
		}

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		if (deleteButton.classList.contains("clickable")) {
			deleteButton.onclick = this.handleDeleteButton.bind(this);
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

					const result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", { node: this.node.name, vmid: this.vmid });

					const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

					while (true) {
						const taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`, "GET");
						if (taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
							break;
						}
						else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
							alert(`Attempted to ${targetAction} ${this.vmid} but got: ${taskStatus.data.exitstatus}`);
							break;
						}
						else { // task has not stopped
							await waitFor(1000);
						}
					}

					this.actionLock = false;
					refreshInstances();
				}
			});
		}
	}

	handleConfigButton () {
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the config page with the node info in the search query
			goToPage("config", { node: this.node.name, type: this.type, vmid: this.vmid });
		}
	}

	handleConsoleButton () {
		if (!this.actionLock && this.status === "running") {
			const data = { console: `${this.type === "qemu" ? "kvm" : "lxc"}`, vmid: this.vmid, vmname: this.name, node: this.node.name, resize: "off", cmd: "" };
			data[`${this.type === "qemu" ? "novnc" : "xtermjs"}`] = 1;
			goToURL(window.PVE, data, true);
		}
	}

	handleDeleteButton () {
		if (!this.actionLock && this.status === "stopped") {
			const header = `Delete VM ${this.vmid}`;
			const body = `<p>Are you sure you want to <strong>delete</strong> VM ${this.vmid}</p>`;

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;

					const action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					const result = await requestAPI(`/cluster/${this.node.name}/${this.type}/${this.vmid}/delete`, "DELETE");
					if (result.status !== 200) {
						alert(`Attempted to delete ${this.vmid} but got: ${result.error}`);
					}

					this.actionLock = false;
					refreshInstances();
				}
			});
		}
	}
}

customElements.define("instance-card", InstanceCard);

async function getInstancesFragment () {
	return await requestDash("/index/instances", "GET");
}

async function refreshInstances () {
	let instances = await getInstancesFragment();
	if (instances.status !== 200) {
		alert("Error fetching instances.");
	}
	else {
		instances = instances.data;
		const container = document.querySelector("#instance-container");
		container.setHTMLUnsafe(instances);
		sortInstances();
	}
}

function initInstances () {
	const container = document.querySelector("#instance-container");
	let instances = container.children;
	instances = [].slice.call(instances);
	for (let i = 0; i < instances.length; i++) {
		instances[i].update();
	}
}

function sortInstances () {
	const searchCriteria = getSearchSettings();
	const searchQuery = document.querySelector("#search").value || null;
	let criteria;
	if (!searchQuery) {
		criteria = (item, query = null) => {
			return { score: item.vmid, alignment: null };
		};
	}
	else if (searchCriteria === "exact") {
		criteria = (item, query) => {
			const substrInc = item.includes(query);
			if (substrInc) {
				const substrStartIndex = item.indexOf(query);
				const queryLength = query.length;
				const remaining = item.length - substrInc - queryLength;
				const alignment = `${"X".repeat(substrStartIndex)}${"M".repeat(queryLength)}${"X".repeat(remaining)}`;
				return { score: 1, alignment };
			}
			else {
				const alignment = `${"X".repeat(item.length)}`;
				return { score: 0, alignment };
			}
		};
	}
	else if (searchCriteria === "fuzzy") {
		const penalties = {
			m: 0,
			x: 1,
			o: 0,
			e: 1
		};
		criteria = (item, query) => {
			// lower is better
			const { score, CIGAR } = global.wfAlign(query, item, penalties, true);
			const alignment = global.DecodeCIGAR(CIGAR);
			return { score: score / item.length, alignment };
		};
	}

	const container = document.querySelector("#instance-container");
	let instances = container.children;
	instances = [].slice.call(instances);

	for (let i = 0; i < instances.length; i++) {
		if (!instances[i].dataset.name) { // if the instance has no name, assume its just empty string
			instances[i].dataset.name = "";
		}
		const { score, alignment } = criteria(instances[i].dataset.name.toLowerCase(), searchQuery ? searchQuery.toLowerCase() : "");
		instances[i].searchQueryResult = { score, alignment };
	}
	const sortCriteria = (a, b) => {
		const aScore = a.searchQueryResult.score;
		const bScore = b.searchQueryResult.score;
		if (aScore === bScore) {
			return a.vmid > b.vmid ? 1 : -1;
		}
		else {
			return aScore - bScore;
		}
	};

	instances.sort(sortCriteria);

	for (let i = 0; i < instances.length; i++) {
		container.appendChild(instances[i]);
		instances[i].update();
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
			<label class="container-specific none" for="confirm-password">Confirm Password</label>
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
				refreshInstances();
			}
			else {
				alert(`Attempted to create new instance ${vmid} but got: ${result.error}`);
				refreshInstances();
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
