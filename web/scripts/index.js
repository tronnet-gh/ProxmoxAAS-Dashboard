import { requestPVE, requestAPI, setAppearance, getSetting, requestDash, setIconSrc, setIconAlt } from "./utils.js";
import { dialog, error } from "./dialog.js";
import { setupClientSync } from "./clientsync.js";
import wfaInit from "../modules/wfa.js";

window.addEventListener("DOMContentLoaded", init);

var wfa;

async function init () {
	setAppearance();

	wfa = await wfaInit("modules/wfa.wasm");
	initInstances();

	document.querySelector("#instance-add").addEventListener("click", handleInstanceAddButton);
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
		if (powerButton !== null) {
			if (powerButton.classList.contains("clickable")) {
				powerButton.onclick = this.handlePowerButton.bind(this);
				powerButton.onkeydown = (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.handlePowerButton();
					}
				};
			}
		}

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		if (deleteButton !== null) {
			if (deleteButton.classList.contains("clickable")) {
				deleteButton.onclick = this.handleDeleteButton.bind(this);
				deleteButton.onkeydown = (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.handleDeleteButton();
					}
				};
			}
		}
	}

	setStatusLoading () {
		this.status = "loading";
		const statusicon = this.shadowRoot.querySelector("#status");
		const powerbtn = this.shadowRoot.querySelector("#power-btn");
		setIconSrc(statusicon, "images/status/loading.svg");
		setIconAlt(statusicon, "instance is loading");
		setIconSrc(powerbtn, "images/status/loading.svg");
		setIconAlt(powerbtn, "");
	}

	async handlePowerButton () {
		if (!this.actionLock) {
			const template = this.shadowRoot.querySelector("#power-dialog");
			dialog(template, async (result, _form) => {
				if (result === "confirm") {
					this.actionLock = true;
					const targetAction = this.status === "running" ? "stop" : "start";

					const result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", { node: this.node.name, vmid: this.vmid });
					this.setStatusLoading();

					const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

					while (true) {
						const taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`, "GET");
						if (taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
							break;
						}
						else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
							error(`Attempted to ${targetAction} ${this.vmid} but got: ${taskStatus.data.exitstatus}`);
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

	handleDeleteButton () {
		if (!this.actionLock && this.status === "stopped") {
			const template = this.shadowRoot.querySelector("#delete-dialog");
			dialog(template, async (result, _form) => {
				if (result === "confirm") {
					this.actionLock = true;

					const action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					const result = await requestAPI(`/cluster/${this.node.name}/${this.type}/${this.vmid}/delete`, "DELETE");
					if (result.status !== 200) {
						error(`Attempted to delete ${this.vmid} but got: ${result.error}`);
					}

					this.actionLock = false;
					refreshInstances();
				}
			});
		}
	}
}

customElements.define("instance-card", InstanceCard);

async function refreshInstances () {
	let instances = await requestDash("/index/instances", "GET");
	if (instances.status !== 200) {
		error(`Error fetching instances: ${instances.status} ${instances.error !== undefined ? instances.error : ""}`);
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
	const searchCriteria = getSetting("search-criteria");
	const searchQuery = document.querySelector("#search").value || null;
	let criteria;
	if (!searchQuery) {
		criteria = (item, _query = null) => {
			return { score: item.vmid, alignment: null };
		};
	}
	else if (searchCriteria === "exact") {
		criteria = (item, query) => {
			const substrInc = item.includes(query);
			if (substrInc) {
				const substrStartIndex = item.indexOf(query);
				const queryLength = query.length;
				const remaining = item.length - substrInc - queryLength + 1;
				const alignment = `${"X".repeat(substrStartIndex)}${"M".repeat(queryLength)}${"X".repeat(remaining)}`;
				return { score: -1, alignment };
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
			const { score, CIGAR } = wfa.wfAlign(query, item, penalties, true);
			const alignment = wfa.DecodeCIGAR(CIGAR);
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

async function handleInstanceAddButton () {
	const template = document.querySelector("#create-instance-dialog");
	const d = dialog(template, async (result, form) => {
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
				error(`Attempted to create new instance ${vmid} but got: ${result.error}`);
				refreshInstances();
			}
		}
	});
	
	// setup type select
	const typeSelect = d.querySelector("#type");
	typeSelect.selectedIndex = -1;
	// on type change, reveal or hide the container specific section
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
	d.querySelectorAll(".container-specific").forEach((element) => {
		element.classList.add("none");
		element.disabled = true;
	});

	// setup pool select
	const poolSelect = d.querySelector("#pool");
	poolSelect.innerHTML = "";
	// add user pools to selector
	const userPools = Object.keys((await requestAPI("/access/pools", "GET")).data.pools);
	userPools.forEach((element) => {
		poolSelect.add(new Option(element));
	});
	poolSelect.selectedIndex = -1;
	// on pool change, get the allowed nodes for that pool, then repopulate the node selector
	poolSelect.addEventListener("change", async () => {
		const pool = (await requestAPI(`/access/pools/${poolSelect.value}`, "GET")).data.pool;

		const nodeSelect = d.querySelector("#node");
		nodeSelect.innerHTML = "";
		const clusterNodes = (await requestPVE("/nodes", "GET")).data;
		const allowedNodes = Object.keys(pool["nodes-allowed"]);
		clusterNodes.forEach((element) => {
			if (element.status === "online" && allowedNodes.includes(element.node)) {
				nodeSelect.add(new Option(element.node));
			}
		});
		nodeSelect.selectedIndex = -1;

		// set vmid min/max
		d.querySelector("#vmid").min = pool["vmid-allowed"].min;
		d.querySelector("#vmid").max = pool["vmid-allowed"].max;
	});

	// setup node select
	const nodeSelect = d.querySelector("#node");
	nodeSelect.selectedIndex = -1;
	// on node change, get the available storages and repopulate the storage selector
	nodeSelect.addEventListener("change", async () => { // change rootfs storage based on node
		const node = nodeSelect.value;
		const storage = (await requestPVE(`/nodes/${node}/storage`, "GET")).data;
		rootfsStorage.innerHTML = "";
		storage.forEach((element) => {
			if (element.content.includes(rootfsContent)) {
				rootfsStorage.add(new Option(element.storage));
			}
		});
		rootfsStorage.selectedIndex = -1;
	});

	// setup root dir select
	const rootfsStorage = d.querySelector("#rootfs-storage");
	rootfsStorage.selectedIndex = -1;
	// set rootfs content type (rootdir)
	const rootfsContent = "rootdir";

	// setup templateImage depending on selected image storage
	const templateImage = d.querySelector("#template-image"); 
	// add template images to selector
	const templates = await requestAPI("/user/ct-templates", "GET");
	for (const template of templates.data) {
		templateImage.append(new Option(template.name, template.volid));
	}
	templateImage.selectedIndex = -1;

	// setup custom password checker for containers
	const password = d.querySelector("#password");
	const confirmPassword = d.querySelector("#confirm-password");
	function validatePassword () {
		confirmPassword.setCustomValidity(password.value !== confirmPassword.value ? "Passwords Don't Match" : "");
	}
	password.addEventListener("change", validatePassword);
	confirmPassword.addEventListener("keyup", validatePassword);

	d.showModal();
}
