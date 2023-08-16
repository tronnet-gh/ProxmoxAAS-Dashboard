class DraggableContainer extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<label id="title"></label>
			<div id="wrapper">
				<draggable-item id="bottom" class="drop-target"></draggable-item>
			</div>
		`;
		this.content = this.shadowRoot.querySelector("#wrapper");
		this.bottom = this.shadowRoot.querySelector("#bottom");
		this.titleElem = this.shadowRoot.querySelector("#title");
	}

	get title () {
		return this.titleElem.innerText;
	}

	set title (title) {
		this.titleElem.innerText = title;
	}

	append (newNode) {
		this.content.insertBefore(newNode, this.bottom);
	}

	insertBefore (newNode, referenceNode) {
		this.content.insertBefore(newNode, referenceNode);
	}

	deleteItemByID (nodeid) {
		const node = this.content.querySelector(`#${nodeid}`);
		if (node) {
			this.content.removeChild(node);
			return true;
		}
		else {
			return false;
		}
	}
}

class DraggableItem extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		// for whatever reason, only grid layout seems to respect the parent's content bounds
		this.shadowRoot.innerHTML = `
			<style>
				#wrapper {
					grid-template-columns: auto 8ch 1fr;
					display: grid;
					column-gap: 10px;
					align-items: center;
				}
				img {
					height: 1em;
					width: 1em;
				}
			</style>
			<div id="wrapper">
				<div style="min-height: 1.5em;"></div>
			</div>
		`;
		this.content = this.shadowRoot.querySelector("#wrapper");
		// add drag and drop listeners
		this.addEventListener("dragstart", (event) => {
			this.content.style.opacity = "0.5";
			event.dataTransfer.setData("application/json", JSON.stringify(this.data));
			event.dataTransfer.setData("text/html", this.content.innerHTML);
			event.dataTransfer.effectAllowed = "move";
		});
		this.addEventListener("dragend", (event) => {
			if (event.dataTransfer.dropEffect === "move") {
				this.parentElement.removeChild(this);
			}
			else {
				this.content.attributeStyleMap.clear();
			}
		});
		this.addEventListener("dragenter", (event) => {
			if (event.target.classList.contains("drop-target")) {
				event.target.classList.add("drag-over");
				event.target.borderTop = true;
			}
			event.preventDefault();
		});
		this.addEventListener("dragleave", (event) => {
			if (event.target.classList.contains("drag-over")) {
				event.target.classList.remove("drag-over");
				event.target.borderTop = false;
			}
			event.preventDefault();
		});
		this.addEventListener("dragover", (event) => {
			event.preventDefault();
		});
		this.addEventListener("drop", (event) => {
			if (event.target.classList.contains("drag-over")) {
				event.target.classList.remove("drag-over");
				event.target.borderTop = false;
			}
			if (event.target.classList.contains("drop-target")) {
				const data = JSON.parse(event.dataTransfer.getData("application/json"));
				const content = event.dataTransfer.getData("text/html");
				const item = document.createElement("draggable-item");
				item.data = data;
				item.innerHTML = content;
				item.draggable = true;
				item.classList.add("drop-target");
				item.id = `boot-${data.id}`;
				event.target.parentElement.insertBefore(item, event.target);
			}
			this.content.attributeStyleMap.clear();
			event.preventDefault();
		});
	}

	get innerHTML () {
		return this.content.innerHTML;
	}

	set innerHTML (innerHTML) {
		this.content.innerHTML = innerHTML;
	}

	get borderTop () {
		return this.content.style.borderTop === "";
	}

	set borderTop (borderTop) {
		if (borderTop) {
			this.content.style.borderTop = "1px dotted";
		}
		else {
			this.content.style.borderTop = "";
		}
	}
}

customElements.define("draggable-container", DraggableContainer);
customElements.define("draggable-item", DraggableItem);
