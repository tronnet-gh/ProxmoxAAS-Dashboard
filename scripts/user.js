import { goToPage, getURIData, setTitleAndHeader, setAppearance, requestAPI, resourcesConfig, mergeDeep, addResourceLine, setSVGAlt, setSVGSrc } from "./utils.js";
import { alert, dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

let username;
let userData;
let allGroups;
let allNodes;
let allPools;
let clusterResourceConfig;

const resourceRulesLines = {}; // list of all resource rules fieldsets on the page

const resourceInputTypes = { // input types for each resource for config page
	cpu: {
		type: "list",
		element: "interactive-list",
		align: "start"
	},
	cores: {
		type: "numeric",
		element: "input",
		attributes: {
			type: "number"
		}
	},
	memory: {
		type: "numeric",
		element: "input",
		attributes: {
			type: "number"
		}
	},
	swap: {
		type: "numeric",
		element: "input",
		attributes: {
			type: "number"
		}
	},
	network: {
		type: "numeric",
		element: "input",
		attributes: {
			type: "number"
		}
	},
	storage: {
		type: "numeric",
		icon: "images/resources/disk.svg",
		element: "input",
		unitText: "B",
		attributes: {
			type: "number"
		}
	},
	pci: {
		type: "list",
		element: "interactive-list",
		align: "start"
	}
};

class InteractiveList extends HTMLElement {
	#name;
	#addText;

	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<style>
				#wrapper {
					border: 1px dotted var(--main-text-color);
					padding: 8px;
				}
			</style>
			<div class="w3-center" id="wrapper">
				<div id="container"></div>
				<svg id="add-btn" class="clickable" tabindex="0" role="button"><use></use></svg>
			</div>
		`;
		this.addBtn = this.shadowRoot.querySelector("#add-btn");
		this.addBtn.onclick = this.#handleAdd.bind(this);
		this.container = this.shadowRoot.querySelector("#container");
		setSVGSrc(this.addBtn, "images/common/add.svg");
		setSVGAlt(this.addBtn, "Add Item");
	}

	get name () {
		return this.#name;
	}

	set name (name) {
		this.#name = name;
	}

	get addText () {
		return this.#addText;
	}

	set addText (addText) {
		this.#addText = addText;
	}

	get value () {
		const ret = [];
		for (const elem of this.container.childNodes) {
			ret.push(elem.value);
		}
		return ret;
	}

	set value (value) {
		this.container.innerHTML = "";
		for (const item of value) {
			this.#addItem(item);
		}
	}

	#addItem (item) {
		const itemElem = document.createElement("interactive-list-match-item");
		itemElem.name = item.name;
		itemElem.match = item.match;
		itemElem.max = item.max;
		this.container.appendChild(itemElem);
	}

	#handleAdd () {
		const header = `Add New ${this.#name} Rule`;

		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="name">Rule Name</label>
				<input class="w3-input w3-border" name="name" id="name" type="text" required>
				<label for="match">Matching Pattern</label>
				<input class="w3-input w3-border" name="match" id="match" type="text" required>
				<label for="max">Max Resource</label>
				<input class="w3-input w3-border" name="max" id="max" type="number" required>
			</form>
		`;

		dialog(header, body, (result, form) => {
			if (result === "confirm") {
				const newItem = {
					name: form.get("name"),
					match: form.get("match"),
					max: form.get("max")
				};
				this.#addItem(newItem);
			}
		});
	}
}

class InteractiveListMatchItem extends HTMLElement {
	#name;
	#match;
	#max;

	#nameElem;
	#matchElem;
	#maxElem;

	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<link rel="stylesheet" href="css/form.css">
			<style>
				#container {
					text-align: left;
					display: grid;
				}
				p {
					padding: 0;
					margin: 0;
					white-space: nowrap;
					overflow: hidden;
				}
				svg {
					margin-top: calc(-0.5em + 0.5lh);
				}

				@media (width >= 993px) {
					#container {
						grid-template-columns: 15% 1fr 15% auto;
					}
				}
				@media (width <= 993px) and (width >= 601px) {
					#container {
						grid-template-columns: 1fr 15% auto;
					}
				}
				@media (width <= 601px) {
					#container {
						grid-template-columns: 1fr auto;
					}
				}
			</style>
			<div id="container">
				<p class="w3-hide-medium w3-hide-small" id="name"></p>
				<p id="match"></p>
				<p class="w3-hide-small" id="max"></p>
				<div>
					<svg id="config-btn" class="clickable" tabindex="0" role="button"><use></use></svg>
					<svg id="delete-btn" class="clickable" tabindex="0" role="button"><use></use></svg>
				</div>
			</div>
		`;
		this.#nameElem = this.shadowRoot.querySelector("#name");
		this.#matchElem = this.shadowRoot.querySelector("#match");
		this.#maxElem = this.shadowRoot.querySelector("#max");

		this.configBtn = this.shadowRoot.querySelector("#config-btn");
		this.configBtn.onclick = this.#handleConfig.bind(this);
		setSVGSrc(this.configBtn, "images/common/config.svg");
		setSVGAlt(this.configBtn, "Config Item");

		this.deleteBtn = this.shadowRoot.querySelector("#delete-btn");
		this.deleteBtn.onclick = this.#handleDelete.bind(this);
		setSVGSrc(this.deleteBtn, "images/actions/delete-active.svg");
		setSVGAlt(this.deleteBtn, "Delete Item");
	}

	#update () {
		this.#nameElem.innerText = this.#name;
		this.#matchElem.innerText = `match="${this.#match}"`;
		this.#maxElem.innerText = `max=${this.#max}`;
	}

	get name () {
		return this.#name;
	}

	set name (name) {
		this.#name = name;
		this.#update();
	}

	get match () {
		return this.#match;
	}

	set match (match) {
		this.#match = match;
		this.#update();
	}

	get max () {
		return this.#max;
	}

	set max (max) {
		this.#max = max;
		this.#update();
	}

	get value () {
		return {
			name: this.#name,
			match: this.#match,
			max: this.#max
		};
	}

	set value (value) {
		this.#name = value.name;
		this.#match = value.match;
		this.#max = value.max;
		this.#update();
	}

	#handleConfig () {
		const header = `Edit ${this.#name} Rule`;

		const body = `
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
				<label for="name">Rule Name</label>
				<input class="w3-input w3-border" name="name" id="name" type="text" required>
				<label for="match">Matching Pattern</label>
				<input class="w3-input w3-border" name="match" id="match" type="text" required>
				<label for="max">Max Resource</label>
				<input class="w3-input w3-border" name="max" id="max" type="number" required>
			</form>
		`;

		const d = dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				const newItem = {
					name: form.get("name"),
					match: form.get("match"),
					max: form.get("max")
				};
				this.value = newItem;
			}
		});

		d.querySelector("#name").value = this.#name;
		d.querySelector("#match").value = this.#match;
		d.querySelector("#max").value = this.#max;
	}

	#handleDelete () {
		const header = `Delete ${this.name}`;
		const body = `<p>Are you sure you want to <strong>delete</strong> ${this.name}</p>`;

		dialog(header, body, async (result, form) => {
			if (result === "confirm") {
				if (this.parentElement) {
					this.parentElement.removeChild(this);
				}
			}
		});
	}
}

customElements.define("interactive-list", InteractiveList);
customElements.define("interactive-list-match-item", InteractiveListMatchItem);

const resourcesConfigPage = mergeDeep({}, resourcesConfig, resourceInputTypes);

async function init () {
	setAppearance();
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	const uriData = getURIData();
	username = uriData.username;

	document.querySelector("#name").innerHTML = document.querySelector("#name").innerHTML.replace("%{username}", username);

	await getUser();
	await populateGroups();
	await populateResources();
	await populateCluster();

	clusterResourceConfig = (await requestAPI("/global/config/resources")).resources;

	document.querySelector("#exit").addEventListener("click", handleFormExit);
}

async function getUser () {
	userData = (await requestAPI(`/access/users/${username}`)).user;
	allGroups = (await requestAPI("/access/groups")).groups;
	allNodes = (await requestAPI("/cluster/nodes")).nodes;
	allPools = (await requestAPI("/cluster/pools")).pools;
}

async function populateGroups () {
	const groupsDisabled = document.querySelector("#groups-disabled");
	const groupsEnabled = document.querySelector("#groups-enabled");
	// for each group in cluster
	for (const groupName of Object.keys(allGroups)) {
		const group = allGroups[groupName];
		const item = document.createElement("draggable-item");
		item.value = group;
		item.innerHTML = `
			<div style="display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center;">
				<svg id="drag" role="application" aria-label="drag icon"><title>drag icon</title><use href="images/actions/drag.svg#symb"></use></svg>
				<p style="margin: 0px;">${group.attributes.cn}</p>
			</div>
		`;
		// if user in group
		if (userData.attributes.memberOf.indexOf(group.dn) !== -1) {
			groupsEnabled.append(item);
		}
		// user is not in group
		else {
			groupsDisabled.append(item);
		}
	}
}

async function populateResources () {
	const field = document.querySelector("#resources");
	for (const resourceName of Object.keys(userData.resources)) {
		const resource = userData.resources[resourceName];
		let resourceLine;
		let resourceConfig;

		if (resourcesConfigPage[resourceName]) {
			resourceConfig = resourcesConfigPage[resourceName];
			resourceConfig.id = `${resourceName}-global`;

			if (resourceConfig.type === "list") {
				resourceLine = addResourceLine(resourceConfig, field, { value: resource.global }, "(Global)");
			}
			else {
				resourceLine = addResourceLine(resourceConfig, field, { value: resource.global.max }, "(Global)");
			}

			postPopulateResourceLine(field, resourceName, "global", resourceConfig, resourceLine);

			for (const nodeSpecificName of Object.keys(resource.nodes)) { // for each node specific, add a line with the node name as a prefix
				resourceConfig.id = `${resourceName}-${nodeSpecificName}`;
				if (resourceConfig.type === "list") {
					resourceLine = addResourceLine(resourceConfig, field, { value: resource.nodes[nodeSpecificName] }, `(${nodeSpecificName})`);
				}
				else {
					resourceLine = addResourceLine(resourceConfig, field, { value: resource.nodes[nodeSpecificName].max }, `(${nodeSpecificName})`);
				}

				postPopulateResourceLine(field, resourceName, nodeSpecificName, resourceConfig, resourceLine);
			}
		}
		else {
			resourceConfig = resourcesConfigPage.storage;
			resourceConfig.id = `${resourceName}-global`;
			resourceConfig.name = resourceName;
			resourceLine = addResourceLine(resourceConfig, field, { value: resource.global.max }, "(Global)");

			postPopulateResourceLine(field, resourceName, "global", resourceConfig, resourceLine);

			for (const nodeSpecificName of Object.keys(resource.nodes)) { // for each node specific, add a line with the node name as a prefix
				resourceConfig.id = `${resourceName}-${nodeSpecificName}`;
				resourceLine = addResourceLine(resourceConfig, field, { value: resource.nodes[nodeSpecificName].max }, `(${nodeSpecificName})`);
				postPopulateResourceLine(field, resourceName, nodeSpecificName, resourceConfig, resourceLine);
			}
		}
	}
	document.querySelector("#resource-add").addEventListener("click", handleResourceAdd);
}

function postPopulateResourceLine (field, resourceName, resourceScope, resourceConfig, resourceLine) {
	const deleteBtn = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	deleteBtn.classList.add("clickable");
	setSVGSrc(deleteBtn, "images/actions/delete-active.svg");
	setSVGAlt(deleteBtn, "Delete Rule");
	field.appendChild(deleteBtn);

	resourceLine.field = field;
	resourceLine.deleteBtn = deleteBtn;
	deleteBtn.onclick = handleResourceDelete.bind(resourceLine);

	if (resourceConfig.align && resourceConfig.align === "start") {
		resourceLine.icon.style.alignSelf = "start";
		resourceLine.icon.style.marginTop = "calc(8px + (0.5lh - 0.5em))";
		resourceLine.label.style.alignSelf = "start";
	}

	resourceLine.resourceName = resourceName;
	resourceLine.resourceScope = resourceScope;
	resourceLine.resourceType = resourceConfig.type;

	resourceRulesLines[resourceLine.element.id] = resourceLine;
}

async function handleResourceAdd () {
	const header = "Add New Resource Constraint";
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="name">PVE Resource Name</label>
			<select class="w3-select w3-border" name="name" id="name" required></select>
			<label for="scope">Constraint Scope</label>
			<select class="w3-select w3-border" name="scope" id="scope" required>
				<option value="global">Global</option>
			</select>
		</form>
    `;

	const d = dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			const name = form.get("name");
			const type = clusterResourceConfig[name].type;
			const scope = form.get("scope");

			// check if the resource name is not in the cluster config resources
			if (!clusterResourceConfig[name]) {
				alert(`${name} is not an allowed resource name`);
			}
			// check if a global scope rule already exists in the user's resource config
			else if (scope === "global" && userData.resources[name] && userData.resources[name].global) {
				alert(`${name} (${scope}) is already a rule`);
			}
			// check if node specific rule already exists in the user's resource config
			else if (scope !== "global" && userData.resources[name] && userData.resources[name].nodes[scope]) {
				alert(`${name} (${scope}) is already a rule`);
			}
			// no existing rule exists, add a new resource rule line and add a the rule to userData
			else {
				// if the rule does not exist at all, add a temporary filler to mark that a new rule has been created
				if (!userData.resources[name]) {
					userData.resources[name] = {
						global: null,
						node: {}
					};
				}

				const field = document.querySelector("#resources");
				const resourceConfig = resourcesConfigPage[name];
				let resourceLine;

				if (scope === "global" && type === "numeric") {
					userData.resources[name].global = { max: 0 };
					resourceLine = addResourceLine(resourceConfig, field, { value: userData.resources[name].global.max }, "(Global)");
				}
				else if (scope === "global" && type === "list") {
					userData.resources[name].global = [];
					resourceLine = addResourceLine(resourceConfig, field, { value: userData.resources[name].global }, "(Global)");
				}
				else if (scope !== "global" && type === "numeric") {
					userData.resources[name].nodes[scope] = { max: 0 };
					resourceLine = addResourceLine(resourceConfig, field, { value: userData.resources[name].nodes[scope].max }, `(${scope})`);
				}
				else if (scope !== "global" && type === "list") {
					userData.resources[name].nodes[scope] = [];
					resourceLine = addResourceLine(resourceConfig, field, { value: userData.resources[name].nodes[scope] }, `(${scope})`);
				}

				postPopulateResourceLine(field, name, scope, resourcesConfigPage[name], resourceLine);
			}
		}
	});

	const nameSelect = d.querySelector("#name");
	for (const resourceName of Object.keys(clusterResourceConfig)) {
		nameSelect.add(new Option(resourceName, resourceName));
	}

	const scopeSelect = d.querySelector("#scope");
	for (const node of allNodes) {
		scopeSelect.add(new Option(node, node));
	}
}

async function handleResourceDelete () {
	const header = `Delete Resource Constraint ${this.label.innerText}`;
	const body = `<p>Are you sure you want to <strong>delete</strong> VM ${this.label.innerText}</p>`;

	dialog(header, body, async (result, form) => {
		if (result === "confirm") {
			this.icon.parentElement.removeChild(this.icon);
			this.label.parentElement.removeChild(this.label);
			this.element.parentElement.removeChild(this.element);
			this.unit.parentElement.removeChild(this.unit);
			this.deleteBtn.parentElement.removeChild(this.deleteBtn);

			if (this.resourceScope === "global") {
				userData.resources[this.resourceName].global = false;
			}
			else {
				userData.resources[this.resourceName].nodes[this.resourceScope] = false;
			}

			delete resourceRulesLines[this.element.id];
		}
	});
}

async function populateCluster () {
	const nodesEnabled = document.querySelector("#nodes-enabled");
	const nodesDisabled = document.querySelector("#nodes-disabled");
	const poolsEnabled = document.querySelector("#pools-enabled");
	const poolsDisabled = document.querySelector("#pools-disabled");

	for (const node of allNodes) { // for each node of all cluster nodes
		const item = document.createElement("draggable-item");
		item.value = node;
		item.innerHTML = `
			<div style="display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center;">
				<svg id="drag" role="application" aria-label="drag icon"><title>drag icon</title><use href="images/actions/drag.svg#symb"></use></svg>
				<p style="margin: 0px;">${node}</p>
			</div>
		`;
		if (userData.cluster.nodes[node] === true) {
			nodesEnabled.append(item);
		}
		else {
			nodesDisabled.append(item);
		}
	}

	for (const pool of allPools) { // for each pool of all cluster pools
		const item = document.createElement("draggable-item");
		item.value = pool;
		item.innerHTML = `
			<div style="display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center;">
				<svg id="drag" role="application" aria-label="drag icon"><title>drag icon</title><use href="images/actions/drag.svg#symb"></use></svg>
				<p style="margin: 0px;">${pool}</p>
			</div>
		`;
		if (userData.cluster.pools[pool] === true) {
			poolsEnabled.append(item);
		}
		else {
			poolsDisabled.append(item);
		}
	}

	const vmidMin = document.querySelector("#vmid-min");
	const vmidMax = document.querySelector("#vmid-max");

	vmidMin.value = userData.cluster.vmid.min;
	vmidMax.value = userData.cluster.vmid.max;

	const adminCheckbox = document.querySelector("#admin");
	adminCheckbox.checked = userData.cluster.admin === true;
}

async function handleFormExit () {
	const body = {
		attributes: {
			memberOf: []
		},
		resources: {},
		cluster: {
			admin: document.querySelector("#admin").checked,
			nodes: {},
			pools: {},
			vmid: {
				min: document.querySelector("#vmid-min").value,
				max: document.querySelector("#vmid-max").value
			}
		}
	};

	for (const group of document.querySelector("#groups-enabled").value) {
		body.attributes.memberOf.push(group.dn);
	}

	// populate resources
	for (const key of Object.keys(resourceRulesLines)) {
		const resourceLine = resourceRulesLines[key];
		// if type is numeric
		if (resourceLine.resourceType === "numeric") {
			if (body.resources[resourceLine.resourceName] === undefined) {
				body.resources[resourceLine.resourceName] = {
					global: {
						max: 0
					},
					nodes: {}
				};
			}
			if (resourceLine.resourceScope === "global") {
				body.resources[resourceLine.resourceName].global.max = resourceLine.element.value;
			}
			else {
				body.resources[resourceLine.resourceName].nodes[resourceLine.resourceScope].max = resourceLine.element.value;
			}
		}
		else {
			if (body.resources[resourceLine.resourceName] === undefined) {
				body.resources[resourceLine.resourceName] = {
					global: [],
					nodes: {}
				};
			}
			if (resourceLine.resourceScope === "global") {
				body.resources[resourceLine.resourceName].global = resourceLine.element.value;
			}
			else {
				body.resources[resourceLine.resourceName].nodes[resourceLine.resourceScope] = resourceLine.element.value;
			}
		}
	}

	// populate nodes
	for (const node of document.querySelector("#nodes-enabled").value) {
		body.cluster.nodes[node] = true;
	}

	// populate pools
	for (const pool of document.querySelector("#pools-enabled").value) {
		body.cluster.pools[pool] = true;
	}

	// TODO post to api

	console.log(body);
}
