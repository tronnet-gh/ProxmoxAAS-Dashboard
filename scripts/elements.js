class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		let instanceArticle = document.createElement("article");
		shadowRoot.append(instanceArticle);

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

		let typeImg = document.createElement("img");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;
		instanceArticle.append(typeImg);

		let vmidParagraph = document.createElement("p");
		vmidParagraph.innerText = data.vmid;
		instanceArticle.append(vmidParagraph);

		let nameParagraph = document.createElement("p");
		nameParagraph.innerText = data.name;
		instanceArticle.append(nameParagraph);

		let nodeImg = document.createElement("img");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;
		instanceArticle.append(nodeImg);

		let nodeParagraph = document.createElement("p");
		nodeParagraph.innerText = data.node.name;
		instanceArticle.append(nodeParagraph);
	}
}

customElements.define("instance-article", Instance);