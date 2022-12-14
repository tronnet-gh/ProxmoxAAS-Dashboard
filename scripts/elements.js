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

		let topDiv = document.createElement("div");
		topDiv.classList.add("instance-top-div");

		let typeImg = document.createElement("img");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;
		topDiv.append(typeImg);

		let vmidParagraph = document.createElement("p");
		vmidParagraph.innerText = data.vmid;
		topDiv.append(vmidParagraph);

		let nameParagraph = document.createElement("p");
		nameParagraph.innerText = data.name;
		topDiv.append(nameParagraph);

		instanceArticle.append(topDiv);

		let nodeImg = document.createElement("img");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;
		instanceArticle.append(nodeImg);

		let nodeParagraph = document.createElement("p");
		nodeParagraph.innerText = data.node.name;
		instanceArticle.append(nodeParagraph);
	}
}

customElements.define("instance-article", Instance);