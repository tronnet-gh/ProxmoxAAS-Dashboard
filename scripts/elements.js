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

		let type = document.createElement("img");
		type.src = `images/${data.type}.svg`;
		instanceArticle.append(type);

		let vmid = document.createElement("p");
		vmid.innerText = data.vmid;
		instanceArticle.append(vmid);

		let name = document.createElement("p");
		name.innerText = data.name;
		instanceArticle.append(name);

		let status = document.createElement("p");
		status.innerText = data.status;
		status.style.color = data.status === "running" ? "#00ff00" : "#ff0000";
		instanceArticle.append(status);

		let nodeName = document.createElement("p");
		nodeName.innerText = data.node.name;
		instanceArticle.append(nodeName);

		let nodeStatus = document.createElement("p");
		nodeStatus.innerText = data.node.status;
		nodeStatus.style.color = data.node.status === "online" ? "#00ff00" : "#ff0000";
		instanceArticle.append(nodeStatus);
	}
}

customElements.define("instance-article", Instance);