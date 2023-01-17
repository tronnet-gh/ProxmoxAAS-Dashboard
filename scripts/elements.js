import {request, goToPage} from "./utils.js";

const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		let instanceTemplate = document.querySelector("#instance-template");
		let instanceTemplateContent = instanceTemplate.content;
		shadowRoot.append(instanceTemplateContent.cloneNode(true));

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
		let typeImg = this.shadowElement.querySelector("#instance-type");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;
		typeImg.alt = `${data.status} instance`;
		this.type = data.type;
		this.status = data.status;

		let vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = data.vmid;
		this.vmid = data.vmid;

		let nameParagraph = this.shadowElement.querySelector("#instance-name");
		if (data.name) {
			nameParagraph.innerText = data.name;
		}
		else {
			nameParagraph.innerText = "";
		}

		let nodeImg = this.shadowElement.querySelector("#node-status");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;

		let nodeParagraph = this.shadowElement.querySelector("#node-name");
		nodeParagraph.innerText = data.node.name;
		this.node = data.node.name;

		let powerButton = this.shadowElement.querySelector("#power-btn");
		powerButton.src = data.status === "running" ? "images/actions/stop.svg" : "images/actions/start.svg";
		powerButton.alt = data.status === "running" ? "shutdown instance" : "start instance";
		powerButton.addEventListener("click", async () => {
			if (!this.actionLock) {
				this.actionLock = true;

				let targetAction = this.status === "running" ? "shutdown" : "start";
				let targetActionDesc = targetAction === "start" ? "starting" : "shutting down";
				let targetStatus = this.status === "running" ? "stopped" : "running";

				let typeImg = this.shadowElement.querySelector("#instance-type");
				typeImg.src = "images/actions/loading.svg";
				typeImg.alt = `instance is ${targetActionDesc}`;
				let powerButton = this.shadowElement.querySelector("#power-btn");
				powerButton.src = "images/actions/loading.svg";
				powerButton.alt = `instance is ${targetActionDesc}`;
				let configButton = this.shadowElement.querySelector("#configure-btn");
				configButton.src = "images/actions/config-inactive.svg";

				let task = await request(`/nodes/${this.node}/${this.type}/${this.vmid}/status/${targetAction}`, "POST", {node: this.node, vmid: this.vmid});

				while (true) {
					let taskStatus = await request(`/nodes/${this.node}/tasks/${task.data}/status`);
					if(taskStatus.data.status === "stopped" && taskStatus.data.exitstatus === "OK") {
						this.status = targetStatus;

						typeImg.src = `images/instances/${this.type}/${this.status}.svg`;
						typeImg.alt = `${this.status} instance`;

						powerButton.src = this.status === "running" ? "images/actions/stop.svg" : "images/actions/start.svg";
						powerButton.alt = this.status === "running" ? "shutdown instance" : "start instance";

						configButton.src = this.status === "running" ? "images/actions/config-inactive.svg" : "images/actions/config-active.svg";

						this.actionLock = false;

						break;
					}
					else if (taskStatus.data.status === "stopped") { // stopped but not OK -> instance did not change state
						typeImg.src = `images/instances/${this.type}/${this.status}.svg`;
						typeImg.alt = `${this.status} instance`;

						powerButton.src = this.status === "running" ? "images/actions/stop.svg" : "images/actions/start.svg";
						powerButton.alt = this.status === "running" ? "shutdown instance" : "start instance";

						configButton.src = this.status === "running" ? "images/actions/config-inactive.svg" : "images/actions/config-active.svg";

						this.actionLock = false;

						console.error(`attempted to ${targetAction} ${this.vmid} but process returned stopped:${taskStatus.data.exitstatus}`);

						break;
					}
					else{
						await waitFor(1000);
					}
				}		
			}
		});
	
		let configButton = this.shadowElement.querySelector("#configure-btn");
		configButton.src = data.status === "running" ? "images/actions/config-inactive.svg" : "images/actions/config-active.svg";
		configButton.addEventListener("click", () => {
			if (!this.actionLock && this.status !== "running") {
				goToPage("config.html", {node: this.node, type: this.type, vmid: this.vmid});
			}
		})
	}
}

customElements.define("instance-article", Instance);