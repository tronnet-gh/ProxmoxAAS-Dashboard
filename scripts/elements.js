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
		let instanceArticle = this.shadowElement.querySelector("article");

		let typeImg = document.querySelector("#instance-type");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;

		let vmidParagraph = document.querySelector("#instance-id");
		vmidParagraph.innerText = data.vmid;

		let nameParagraph = document.querySelector("#instance-name");
		nameParagraph.innerText = data.name;

		let nodeImg = document.querySelector("#node-status");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;

		let nodeParagraph = document.querySelector("#node-name");
		nodeParagraph.innerText = data.node.name;
	}
}

customElements.define("instance-article", Instance);