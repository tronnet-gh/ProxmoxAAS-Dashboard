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

		let summaryDiv = document.createElement("div");
		summaryDiv.classList.add("instance-div");

		let instanceSubDiv = document.createElement("div");
		instanceSubDiv.classList.add("summary-sub-div");

		let typeImg = document.createElement("img");
		typeImg.src = `images/instances/${data.type}/${data.status}.svg`;
		instanceSubDiv.append(typeImg);

		let vmidParagraph = document.createElement("p");
		vmidParagraph.innerText = data.vmid;
		instanceSubDiv.append(vmidParagraph);

		let nameParagraph = document.createElement("p");
		nameParagraph.innerText = data.name;
		instanceSubDiv.append(nameParagraph);

		summaryDiv.append(instanceSubDiv);

		let nodeSubDiv = document.createElement("div");
		nodeSubDiv.classList.add("summary-sub-div");

		let nodeImg = document.createElement("img");
		nodeImg.src = `images/nodes/${data.node.status}.svg`;
		nodeSubDiv.append(nodeImg);

		let nodeParagraph = document.createElement("p");
		nodeParagraph.innerText = data.node.name;
		nodeSubDiv.append(nodeParagraph);

		summaryDiv.append(nodeSubDiv);

		instanceArticle.append(summaryDiv);
	}
}

customElements.define("instance-article", Instance);