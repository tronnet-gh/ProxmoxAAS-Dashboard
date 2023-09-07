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

	querySelector (query) {
		return this.content.querySelector(query);
	}

	removeChild (node) {
		if (node && this.content.contains(node)) {
			this.content.removeChild(node);
			return true;
		}
		else {
			return false;
		}
	}

	set value (value) {}

	get value () {
		const value = [];
		this.content.childNodes.forEach((element) => {
			if (element.value) {
				value.push(element.value);
			}
		});
		return value;
	}
}

class DraggableItem extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		// for whatever reason, only grid layout seems to respect the parent's content bounds
		this.shadowRoot.innerHTML = `
			<style>
				#drag {
					cursor: move;
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
			const data = { id: this.id, data: this.data, content: this.content.innerHTML, value: this.value };
			event.dataTransfer.setData("application/json", JSON.stringify(data));
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
			if (event.target.dropTarget) {
				event.target.dragOver = true;
			}
			event.preventDefault();
		});
		this.addEventListener("dragleave", (event) => {
			if (event.target.dragOver) {
				event.target.dragOver = false;
			}
			event.preventDefault();
		});
		this.addEventListener("dragover", (event) => {
			event.preventDefault();
		});
		this.addEventListener("drop", (event) => {
			if (event.target.dragOver) {
				event.target.dragOver = false;
			}
			if (event.target.dropTarget) {
				const transfer = JSON.parse(event.dataTransfer.getData("application/json"));
				const item = document.createElement("draggable-item");
				item.data = transfer.data;
				item.innerHTML = transfer.content;
				item.draggable = true;
				item.dropTarget = true;
				item.id = transfer.id;
				item.value = transfer.data.value;
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

	get dropTarget () {
		return this.classList.contains("drop-target");
	}

	set dropTarget (dropTarget) {
		if (dropTarget) {
			this.classList.add("drop-target");
		}
		else {
			this.classList.remove("drop-target");
		}
	}

	get dragOver () {
		return this.classList.contains("drag-over");
	}

	set dragOver (dragOver) {
		if (dragOver) {
			this.classList.add("drag-over");
			// temp hover over effect
			this.content.style.borderTop = "1px dotted";
		}
		else {
			this.classList.remove("drag-over");
			// temp hover over effect
			this.content.style.borderTop = "";
		}
	}
}

customElements.define("draggable-container", DraggableContainer);
customElements.define("draggable-item", DraggableItem);
