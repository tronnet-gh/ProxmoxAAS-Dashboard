class Node extends HTMLElement {
	constructor () { // <link rel="stylesheet" href="style.css" type="text/css">
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		let nodeArticle = document.createElement("article");
		shadowRoot.append(nodeArticle);

		let styleLink = document.createElement("link");
		styleLink.rel = "stylesheet";
		styleLink.href = "style.css";
		styleLink.type = "text/css";
		shadowRoot.append(styleLink);

		this.shadowElement = shadowRoot;
	}

	set data (data) {
		let articleElement = this.shadowElement.querySelector("article");

		let nodeName = document.createElement("h2");
		nodeName.innerText = data.node;
		articleElement.append(nodeName);

		let onlineLabel = document.createElement("h3");
		onlineLabel.innerText = data.status;
		onlineLabel.style.color = data.status === "online" ? "#00ff00" : "#ff0000";
		articleElement.append(onlineLabel);
	}
}

customElements.define("node-card", Node);