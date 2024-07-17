const blank = document.createElement("img");

class DraggableContainer extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<style>
				draggable-item.ghost::part(wrapper) {
					border: 1px dashed var(--main-text-color);
					border-radius: 5px;
					margin: -1px;
				}
			</style>
			<label id="title"></label>
			<div id="wrapper" style="padding-bottom: 1em;"></div>
		`;
		this.content = this.shadowRoot.querySelector("#wrapper");
		this.titleElem = this.shadowRoot.querySelector("#title");

		window.Sortable.create(this.content, {
			group: "boot",
			ghostClass: "ghost",
			setData: function (dataTransfer, dragEl) {
				dataTransfer.setDragImage(blank, 0, 0);
			}
		});
	}

	get title () {
		return this.titleElem.innerText;
	}

	set title (title) {
		this.titleElem.innerText = title;
	}

	append (newNode) {
		this.content.appendChild(newNode, this.bottom);
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
	uuid = null;
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		// for whatever reason, only grid layout seems to respect the parent's content bounds
		this.shadowRoot.innerHTML = `
			<style>
				img {
					height: 1em;
					width: 1em;
				}
				* {
					-webkit-box-sizing: border-box;
					-moz-box-sizing: border-box;
					box-sizing: border-box;
				}
			</style>
			<div id="wrapper" part="wrapper"></div>
		`;
		this.content = this.shadowRoot.querySelector("#wrapper");
	}

	get innerHTML () {
		return this.content.innerHTML;
	}

	set innerHTML (innerHTML) {
		this.content.innerHTML = innerHTML;
	}
}

customElements.define("draggable-container", DraggableContainer);
customElements.define("draggable-item", DraggableItem);
