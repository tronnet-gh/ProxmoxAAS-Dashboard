const blank = document.createElement("img");

class DraggableContainer extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		this.content = this.shadowRoot.querySelector("#wrapper");

		window.Sortable.create(this.content, {
			group: this.dataset.group,
			ghostClass: "ghost",
			setData: function (dataTransfer, dragEl) {
				dataTransfer.setDragImage(blank, 0, 0);
			}
		});
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

	hasChildNodes (query) {
		return this.querySelector(query) !== null;
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
			if (element.dataset.value) {
				value.push(element.dataset.value);
			}
		});
		return value;
	}
}

customElements.define("draggable-container", DraggableContainer);
