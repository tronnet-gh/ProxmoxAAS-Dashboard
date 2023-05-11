import {requestPVE, requestAPI, goToPage, goToURL, instances, nodes} from "./utils.js";
import {dialog} from "./dialog.js";

export class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<div class="w3-row">
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
					<img id="power-btn" class="clickable">
					<img id="console-btn" class="clickable">
					<img id="configure-btn" class="clickable">
					<img id="delete-btn" class="clickable">
				</div>
			</div>
		`;

		this.shadowElement = shadowRoot;
		this.actionLock = false;
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
		let vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = this.vmid;

		let nameParagraph = this.shadowElement.querySelector("#instance-name");
		nameParagraph.innerText = this.name ? this.name : "";

		let typeParagraph = this.shadowElement.querySelector("#instance-type");
		typeParagraph.innerText = this.type;

		let statusParagraph = this.shadowElement.querySelector("#instance-status");
		statusParagraph.innerText = this.status;

		let statusIcon = this.shadowElement.querySelector("#instance-status-icon");
		statusIcon.src = instances[this.status].statusSrc;
		statusIcon.alt = instances[this.status].statusAlt;

		let nodeNameParagraph = this.shadowElement.querySelector("#node-name");
		nodeNameParagraph.innerText = this.node.name;

		let nodeStatusParagraph = this.shadowElement.querySelector("#node-status");
		nodeStatusParagraph.innerText = this.node.status;

		let nodeStatusIcon = this.shadowElement.querySelector("#node-status-icon");
		nodeStatusIcon.src = nodes[this.node.status].statusSrc;
		nodeStatusIcon.alt = nodes[this.node.status].statusAlt;

		let powerButton = this.shadowElement.querySelector("#power-btn");
		powerButton.src = instances[this.status].powerButtonSrc;
		powerButton.alt = instances[this.status].powerButtonAlt;
		powerButton.title = instances[this.status].powerButtonAlt;
		powerButton.onclick = this.handlePowerButton.bind(this)

		let configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = instances[this.status].configButtonSrc;
		configButton.alt = instances[this.status].configButtonAlt;
		configButton.title = instances[this.status].configButtonAlt;
		configButton.onclick = this.handleConfigButton.bind(this);

		let consoleButton = this.shadowElement.querySelector("#console-btn");
		consoleButton.src = instances[this.status].consoleButtonSrc;
		consoleButton.alt = instances[this.status].consoleButtonAlt;
		consoleButton.title = instances[this.status].consoleButtonAlt;
		consoleButton.onclick = this.handleConsoleButton.bind(this);

		let deleteButton = this.shadowElement.querySelector("#delete-btn");
		deleteButton.src = instances[this.status].deleteButtonSrc;
		deleteButton.alt = instances[this.status].deleteButtonAlt;
		deleteButton.title = instances[this.status].deleteButtonAlt;
		deleteButton.onclick = this.handleDeleteButton.bind(this);

		if (this.node.status !== "online") {
			powerButton.classList.add("hidden");
			configButton.classList.add("hidden");
			consoleButton.classList.add("hidden");
			deleteButton.classList.add("hidden");
		}
	}

	async handlePowerButton () {

		if(!this.actionLock) {
			let header = `${this.status === "running" ? "Stop" : "Start"} VM ${this.vmid}`;
			let body = `<p>Are you sure you want to ${this.status === "running" ? "stop" : "start"} VM</p><p>${this.vmid}</p>`

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					let targetAction = this.status === "running" ? "stop" : "start";
					let targetStatus = this.status === "running" ? "stopped" : "running";
					let prevStatus = this.status;
					this.status = "loading";

					this.update();

					let result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", {node: this.node.name, vmid: this.vmid});

					const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

					while (true) {
						let taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`, "GET");
						if(taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
							this.status = targetStatus;
							this.update();
							this.actionLock = false;
							break;
						}
						else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
							this.status = prevStatus;
							console.error(`attempted to ${targetAction} ${this.vmid} but process returned stopped:${result.data.exitstatus}`);
							this.update();
							this.actionLock = false;
							break;
						}
						else{ // task has not stopped
							await waitFor(1000);
						}
					}
				}
			});
		}
	}

	handleConfigButton () {
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the conig page with the node infor in the search query
			goToPage("config.html", {node: this.node.name, type: this.type, vmid: this.vmid});
		}
	}

	handleConsoleButton () {
		if (!this.actionLock && this.status === "running") {
			let data = {console: `${this.type === "qemu" ? "kvm" : "lxc"}`, vmid: this.vmid, vmname: this.name, node: this.node.name, resize: "off", cmd: ""};
			data[`${this.type === "qemu" ? "novnc" : "xtermjs"}`] = 1;
			goToURL("https://pve.tronnet.net", data, true);
		}
	}

	handleDeleteButton () {
		if (!this.actionLock && this.status === "stopped") {

			let header = `Delete VM ${this.vmid}`;
			let body = `<p>Are you sure you want to <strong>delete</strong> VM </p><p>${this.vmid}</p>`

			dialog(header, body, async (result, form) => {
				if (result === "confirm") {
					this.actionLock = true;
					let prevStatus = this.status;
					this.status = "loading";
					this.update();

					let action = {};
					action.purge = 1;
					action["destroy-unreferenced-disks"] = 1;

					let body = {
						node: this.node.name,
						type: this.type,
						vmid: this.vmid,
						action: JSON.stringify(action)
					};

					let result = await requestAPI("/instance", "DELETE", body);
					if (result.status === 200) {
						this.parentNode.removeChild(this);
					}
					else {
						console.error(result);
						this.status = this.prevStatus;
						this.update();
						this.actionLock = false;
					}
				}
			});
		}
	}
}

customElements.define("instance-obj", Instance);