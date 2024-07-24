import { requestPVE, requestAPI, goToPage, goToURL, instancesConfig, nodesConfig, setSVGSrc, setSVGAlt } from "./utils.js";
import { PVE } from "../vars.js";
import { dialog } from "./dialog.js";

class InstanceCard extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="w3.css">
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
					<svg id="instance-status-icon"></svg>
					<p id="instance-status"></p>
				</div>
				<div class="w3-col l2 w3-hide-medium w3-hide-small">
					<p id="node-name"></p>
				</div>
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
