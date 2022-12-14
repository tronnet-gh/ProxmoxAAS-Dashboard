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

		let detailDiv = document.createElement("div");
		detailDiv.classList.add("instance-div");

		let typeImg = document.createElement("img");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;
		detailDiv.append(typeImg);

		let vmidParagraph = document.createElement("p");
		vmidParagraph.innerText = data.vmid;
		detailDiv.append(vmidParagraph);

		let nameParagraph = document.createElement("p");
		nameParagraph.innerText = data.name;
		detailDiv.append(nameParagraph);

		instanceArticle.append(detailDiv);

		let nodeDiv = document.createElement("div");
		nodeDiv.classList.add("instance-div");

		let nodeImg = document.createElement("img");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;
		nodeDiv.append(nodeImg);

		let nodeParagraph = document.createElement("p");
		nodeParagraph.innerText = data.node.name;
		nodeDiv.append(nodeParagraph);

		instanceArticle.append(nodeDiv);
	}
}

customElements.define("instance-article", Instance);