import {requestPVE, goToPage, instances, getCookie} from "./utils.js";

export class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
		<link rel="stylesheet" href="css/style.css" type="text/css">
		<link rel="stylesheet" href="css/instance.css" type="text/css">
		<article>
			<div>
				<div>
					<img id="instance-type">
					<p id="instance-id"></p>
					<p id="instance-name"></p>
				</div>
				<div>
					<img id="node-status" alt="instance node">
					<p id="node-name"></p>
				</div>
			</div>
			<hr>
			<div class="btn-group">
				<img id="power-btn">
				<img id="configure-btn" alt="change instance configuration">
				<img id="console-btn" alt="connect to instance console or display">
			</div>
		</article>
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
		let typeImg = this.shadowElement.querySelector("#instance-type");
		typeImg.src = `images/instances/${this.type}/${this.status}.svg`;
		typeImg.alt = `${this.status} instance`;

		let vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = this.vmid;

		let nameParagraph = this.shadowElement.querySelector("#instance-name");
		nameParagraph.innerText = this.name ? this.name : "";

		let nodeImg = this.shadowElement.querySelector("#node-status");
		nodeImg.src = `images/nodes/${this.node.status}.svg`;

		let nodeParagraph = this.shadowElement.querySelector("#node-name");
		nodeParagraph.innerText = this.node.name;

		let powerButton = this.shadowElement.querySelector("#power-btn");
		powerButton.src = instances[this.status].powerButtonSrc;
		powerButton.alt = instances[this.status].powerButtonAlt;
		powerButton.title = instances[this.status].powerButtonAlt;
		powerButton.addEventListener("click", this.handlePowerButton.bind(this));

		let configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = instances[this.status].configButtonSrc;
		configButton.alt = instances[this.status].configButtonAlt;
		configButton.title = instances[this.status].configButtonAlt;
		configButton.addEventListener("click", this.handleConfigButton.bind(this));

		let consoleButton = this.shadowElement.querySelector("#console-btn");
		consoleButton.src = instances[this.status].consoleButtonSrc;
		consoleButton.alt = instances[this.status].consoleButtonAlt;
		consoleButton.title = instances[this.status].consoleButtonAlt;
		consoleButton.addEventListener("click", this.handleConsoleButton.bind(this));

		if (this.node.status !== "online") {
			powerButton.classList.add("hidden");
			configButton.classList.add("hidden");
			consoleButton.classList.add("hidden");
		}
	}

	async handlePowerButton () {
		if(!this.actionLock) {
			this.actionLock = true;
			let targetAction = this.status === "running" ? "shutdown" : "start";
			let targetStatus = this.status === "running" ? "stopped" : "running";
			let prevStatus = this.status;
			this.status = "loading";

			this.update();

			let result = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", {node: this.node.name, vmid: this.vmid});

			const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

			while (true) {
				let taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${result.data}/status`);
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
	}

	handleConfigButton () {
		if (!this.actionLock && this.status === "stopped") { // if the action lock is false, and the node is stopped, then navigate to the conig page with the node infor in the search query
			goToPage("config.html", {node: this.node.name, type: this.type, vmid: this.vmid});
		}
	}

	handleConsoleButton () {
		if (this.status === "running") {
			goToPage("pve-xtermjs/index.html", {type: this.type, vmid: this.vmid, name: this.name, node: this.node.name, user: getCookie("username"), url: "pve.tronnet.net/api2/json"});
		}
	}
}

export class Dialog extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
		<link rel="stylesheet" href="css/style.css" type="text/css">
		<link rel="stylesheet" href="css/form.css" type="text/css">
		<link rel="stylesheet" href="css/dialog.css" type="text/css">
		<dialog>
			<p id="prompt"></p>
			<hr>
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			</form>
			<hr id="base-hr">
			<div class="btn-group">
				<button value="cancel" form="form">Cancel</button>
				<button value="confirm" form="form">Confirm</button>
			</div>
		</dialog>
		`;

		this.shadowElement = shadowRoot;
		this.dialog = shadowRoot.querySelector("dialog");
		this.form = shadowRoot.querySelector("form");
	}

	set header (header) {
		this.shadowElement.querySelector("#prompt").innerText = header;
	}

	append (element) {
		this.form.append(element);
	}
	
	set callback (callback) {
		this.dialog.addEventListener("close", async () => {
			await callback(this.dialog.returnValue, new FormData(this.form));
			document.querySelector("dialog-form").remove();
		});
	}
	show () {
		this.dialog.showModal();
	}
}

customElements.define("instance-article", Instance);
customElements.define("dialog-form", Dialog);