import {requestPVE, goToPage, instances} from "./utils.js";

const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
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
			</div>
		</article>
		`;

		let styleLink = document.createElement("link");
		styleLink.rel = "stylesheet";
		styleLink.href = "css/style.css";
		styleLink.type = "text/css";
		shadowRoot.append(styleLink);

		let instanceLink = document.createElement("link");
		instanceLink.rel = "stylesheet";
		instanceLink.href = "css/instance.css";
		instanceLink.type = "text/css";
		shadowRoot.append(instanceLink);

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
		powerButton.addEventListener("click", this.handlePowerButton.bind(this));

		let configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = instances[this.status].configButtonSrc;
		configButton.alt = instances[this.status].configButtonAlt;
		configButton.addEventListener("click", () => {
			if (!this.actionLock && this.status !== "running") {
				goToPage("config.html", {node: this.node.name, type: this.type, vmid: this.vmid});
			}
		});

		if (this.node.status !== "online") {
			powerButton.classList.add("hidden");
			configButton.classList.add("hidden");
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

			let task;

			try {
				task = await requestPVE(`/nodes/${this.node.name}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", {node: this.node.name, vmid: this.vmid});
			}
			catch (error) {
				this.status = prevStatus;
				this.update();
				this.actionLock = false;
				console.error(error);
				return;
			}

			while (true) {
				let taskStatus = await requestPVE(`/nodes/${this.node.name}/tasks/${task.data}/status`);
				if(taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") { // task stopped and was successful
					this.status = targetStatus;
					this.update();
					this.actionLock = false;
					return;
				}
				else if (taskStatus.data.status === "stopped") { // task stopped but was not successful
					this.status = prevStatus;
					console.error(`attempted to ${targetAction} ${this.vmid} but process returned stopped:${taskStatus.data.exitstatus}`);
					this.update();
					this.actionLock = false;
					return;
				}
				else{
					await waitFor(1000);
				}
			}
		}
	}
}

customElements.define("instance-article", Instance);