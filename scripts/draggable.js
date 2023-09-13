// Map valid UUIDs used by draggable-item elements in order to better validate data transfers to ignore random data transfers.
const draggableItemUUIDs = {};

/**
 * Validate a data transfer object through its data types. Valid draggable-item events have one type of the format `application/json/${uuid}`.
 * The function takes the entire type list from event.dataTransfer.types and returns true if the dataTransfer object is likely to be valid.
 * @param {*} formatList from event.dataTransfer.types
 * @returns {Boolean} true if dataTransfer is valid (from a draggable-item source on this page), false otherwise
 */
function getDragSource (typesList) {
	if (typesList.length !== 1) {
		return null;
	}
	const typeString = typesList[0];
	const type = typeString.split("/");
	if (type.length === 3 && type[0] === "application" && type[1] === "json" && draggableItemUUIDs[type[2]]) {
		return { type: typeString, uuid: type[2], element: draggableItemUUIDs[type[2]] };
	}
	else {
		return null;
	}
}

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
		newNode.uuid = window.crypto.randomUUID();
		draggableItemUUIDs[newNode.uuid] = newNode;
		this.content.insertBefore(newNode, this.bottom);
	}

	insertBefore (newNode, referenceNode) {
		newNode.uuid = window.crypto.randomUUID();
		draggableItemUUIDs[newNode.uuid] = newNode;
		this.content.insertBefore(newNode, referenceNode);
	}

	querySelector (query) {
		return this.content.querySelector(query);
	}

	removeChild (node) {
		if (node && this.content.contains(node)) {
			draggableItemUUIDs[node.uuid] = null;
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
	uuid = null;
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		// for whatever reason, only grid layout seems to respect the parent's content bounds
		this.shadowRoot.innerHTML = `
			<style>
				#drag-over {
					height: 1.5em; 
					border: 1px dotted var(--main-text-color); 
					border-radius: 5px; 
					background-color: rgba(0,0,0,0.25); 
				}
				img {
					height: 1em;
					width: 1em;
				}
			</style>
			<div id="drag-over" style="display: none;"></div>
			<div id="wrapper">
				<div style="min-height: 1.5em;"></div>
			</div>
		`;
		this.content = this.shadowRoot.querySelector("#wrapper");
		// add drag and drop listeners
		this.addEventListener("dragstart", (event) => {
			this.content.style.opacity = "0.5";
			const data = { id: this.id, data: this.data, content: this.content.innerHTML, value: this.value };
			event.dataTransfer.setData(`application/json/${this.uuid}`, JSON.stringify(data));
			event.dataTransfer.effectAllowed = "move";
			const blank = document.createElement("img");
			event.dataTransfer.setDragImage(blank, 0, 0);
			setTimeout(() => {
				this.content.style.visibility = "hidden";
				this.content.style.height = "0";
			}, 0);
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
			const sourceElement = getDragSource(event.dataTransfer.types);
			if (event.target.dropTarget && sourceElement) {
				event.target.dragOver = sourceElement.element.innerHTML;
			}
			event.preventDefault();
		});
		this.addEventListener("dragleave", (event) => {
			if (event.target.dragOver && getDragSource(event.dataTransfer.types)) {
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
			const sourceElement = getDragSource(event.dataTransfer.types);
			if (event.target.dropTarget && sourceElement) {
				const transfer = JSON.parse(event.dataTransfer.getData(sourceElement.type));
				const item = document.createElement("draggable-item");
				item.data = transfer.data;
				item.innerHTML = transfer.content;
				item.draggable = true;
				item.dropTarget = true;
				item.id = transfer.id;
				item.value = transfer.data.value;
				item.uuid = sourceElement.uuid;
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
			this.shadowRoot.querySelector("#drag-over").style.display = "block";
			this.shadowRoot.querySelector("#drag-over").innerHTML = dragOver;
		}
		else {
			this.classList.remove("drag-over");
			this.shadowRoot.querySelector("#drag-over").style.display = "none";
			this.shadowRoot.querySelector("#drag-over").innerHTML = "";
		}
	}
}

customElements.define("draggable-container", DraggableContainer);
customElements.define("draggable-item", DraggableItem);
