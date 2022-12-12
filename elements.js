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

	set qemu (qemu) {
		let articleElement = this.shadowElement.querySelector("article");

		let qemuDiv = document.createElement("div");
		for (let i = 0; i < qemu.length; i++) {
			let newInstance = document.createElement("instance-div");
			newInstance.data = qemu[i];
			qemuDiv.append(newInstance);
		}
		articleElement.append(qemuDiv);
	}

	set lxc (lxc) {
		let articleElement = this.shadowElement.querySelector("article");

		let lxcDiv = document.createElement("div");
		for (let i = 0; i < lxc.length; i++) {
			let newInstance = document.createElement("instance-div");
			newInstance.data = lxc[i];
			lxcDiv.append(newInstance);
		}
		articleElement.append(lxcDiv);
	}
}

class Instance extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		let instanceDiv = document.createElement("div");
		shadowRoot.append(instanceDiv);

		let styleLink = document.createElement("link");
		styleLink.rel = "stylesheet";
		styleLink.href = "style.css";
		styleLink.type = "text/css";
		shadowRoot.append(styleLink);

		this.shadowElement = shadowRoot;
	}

	set data (data) {
		let instanceDiv = this.shadowElement.querySelector("div");

		let instanceParagraph = document.createElement("p");
		instanceParagraph.innerText = `CT | ${data.vmid} | ${data.name} | ${data.status}`;
		instanceParagraph.style.color = data.status == "running" ? "#00ff00" : "#ff0000";
		instanceDiv.append(instanceParagraph);
	}
}

customElements.define("node-article", Node);
customElements.define("instance-div", Instance);