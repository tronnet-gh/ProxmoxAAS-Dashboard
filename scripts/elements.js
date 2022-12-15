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
	}

	set data (data) {
		let typeImg = this.shadowElement.querySelector("#instance-type");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;

		let vmidParagraph = this.shadowElement.querySelector("#instance-id");
		vmidParagraph.innerText = data.vmid;

		let nameParagraph = this.shadowElement.querySelector("#instance-name");
		nameParagraph.innerText = data.name;

		let nodeImg = this.shadowElement.querySelector("#node-status");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;

		let nodeParagraph = this.shadowElement.querySelector("#node-name");
		nodeParagraph.innerText = data.node.name;

		let resourceCPU = this.shadowElement.querySelector("#resource-cpu");
		resourceCPU.innerText = data.cpus;

		let resourceRAM = this.shadowElement.querySelector("#resource-ram");
		resourceRAM.innerText = (data.maxmem / 1073741824).toFixed(3);

		let resourceSWAP = this.shadowElement.querySelector("#resource-swap");
		resourceSWAP.innerText = (data.maxswap / 1073741824).toFixed(3);

		let resourceDISK = this.shadowElement.querySelector("#resource-disk");
		resourceDISK.innerText = (data.maxdisk / 1073741824).toFixed(3);
	}
}

customElements.define("instance-article", Instance);