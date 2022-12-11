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
			let instanceParagraph = document.createElement("p");
			instanceParagraph.innerText = `${qemu[i].vmid}: ${qemu[i].name}`;
			qemuDiv.append(instanceParagraph);
		}
		articleElement.append(qemuDiv);
	}

	set lxc (lxc) {
		let articleElement = this.shadowElement.querySelector("article");

		let lxcDiv = document.createElement("div");
		for (let i = 0; i < lxc.length; i++) {
			let instanceParagraph = document.createElement("p");
			instanceParagraph.innerText = `${lxc[i].vmid}: ${lxc[i].name}`;
			lxcDiv.append(instanceParagraph);
		}
		articleElement.append(lxcDiv);
	}
}

customElements.define("node-card", Node);