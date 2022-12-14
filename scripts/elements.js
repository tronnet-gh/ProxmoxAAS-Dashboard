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

		let instanceParagraph = document.createElement("p");
		instanceParagraph.innerText = `${data.type} | ${data.vmid} | ${data.name} | ${data.status} | ${data.node.name} (${data.node.status})`;
		instanceParagraph.style.color = data.status === "running" ? "#00ff00" : "#ff0000";
		instanceArticle.append(instanceParagraph);
	}
}

customElements.define("instance-article", Instance);