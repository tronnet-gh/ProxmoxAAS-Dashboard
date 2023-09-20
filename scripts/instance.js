import { requestPVE, requestAPI, goToPage, goToURL, instancesConfig, nodesConfig } from "./utils.js";
import { PVE } from "../vars.js";
import { dialog } from "./dialog.js";

class InstanceCard extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<style>
				* {
					margin: 0;
				}
			</style>
			<div class="w3-row" style="margin-top: 1em; margin-bottom: 1em;">
				<hr class="w3-show-small w3-hide-medium w3-hide-large" style="margin: 0; margin-bottom: 1em;">
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
				<div class="w3-col l2 m2 s6 flex row nowrap" style="height: 1lh;">
					<img id="power-btn">
					<img id="console-btn">
					<img id="configure-btn">
					<img id="delete-btn">
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
			const nameParts = this.name.split(this.searchQuery);
			nameParagraph.innerHTML += `<span>${nameParts[0]}</span>`;
			for (let i = 1; i < nameParts.length; i++) {
				nameParagraph.innerHTML += `<span style="color: var(--lightbg-text-color); background-color: var(--highlight-color);">${this.searchQuery}</span><span>${nameParts[i]}</span>`;
			}
		}
		else {
			nameParagraph.innerText = this.name ? this.name : "";
		}

		const typeParagraph = this.shadowRoot.querySelector("#instance-type");
		typeParagraph.innerText = this.type;

		const statusParagraph = this.shadowRoot.querySelector("#instance-status");
		statusParagraph.innerText = this.status;

		const statusIcon = this.shadowRoot.querySelector("#instance-status-icon");
		statusIcon.src = instancesConfig[this.status].status.src;
		statusIcon.alt = instancesConfig[this.status].status.alt;

		const nodeNameParagraph = this.shadowRoot.querySelector("#node-name");
		nodeNameParagraph.innerText = this.node.name;

		const nodeStatusParagraph = this.shadowRoot.querySelector("#node-status");
		nodeStatusParagraph.innerText = this.node.status;

		const nodeStatusIcon = this.shadowRoot.querySelector("#node-status-icon");
		nodeStatusIcon.src = nodesConfig[this.node.status].status.src;
		nodeStatusIcon.alt = nodesConfig[this.node.status].status.src;

		const powerButton = this.shadowRoot.querySelector("#power-btn");
		powerButton.src = instancesConfig[this.status].power.src;
		powerButton.alt = instancesConfig[this.status].power.alt;
		powerButton.title = instancesConfig[this.status].power.alt;
		if (instancesConfig[this.status].power.clickable) {
			powerButton.classList.add("clickable");
			powerButton.onclick = this.handlePowerButton.bind(this);
		}

		const configButton = this.shadowRoot.querySelector("#configure-btn");
		configButton.src = instancesConfig[this.status].config.src;
		configButton.alt = instancesConfig[this.status].config.alt;
		configButton.title = instancesConfig[this.status].config.alt;
		if (instancesConfig[this.status].config.clickable) {
			configButton.classList.add("clickable");
			configButton.onclick = this.handleConfigButton.bind(this);
		}

		const consoleButton = this.shadowRoot.querySelector("#console-btn");
		consoleButton.src = instancesConfig[this.status].console.src;
		consoleButton.alt = instancesConfig[this.status].console.alt;
		consoleButton.title = instancesConfig[this.status].console.alt;
		if (instancesConfig[this.status].console.clickable) {
			consoleButton.classList.add("clickable");
			consoleButton.onclick = this.handleConsoleButton.bind(this);
		}

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
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

					const result = await requestAPI(`/cluster/${this.node.name}/${this.type}/${this.vmid}/delete`, "DELETE");
					if (result.status === 200) {
						this.parentElement.removeChild(this);
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
