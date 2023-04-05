export class Dialog extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
		<link rel="stylesheet" href="css/style.css" type="text/css">
		<link rel="stylesheet" href="css/form.css" type="text/css">
		<link rel="stylesheet" href="css/dialog.css" type="text/css">
		<link rel="stylesheet" href="css/button.css" type="text/css">
		<dialog>
			<p id="prompt"></p>
			<hr>
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			</form>
			<hr>
			<div class="btn-group">
				<button value="cancel" form="form" class="cancel" formnovalidate>CANCEL</button>
				<button value="confirm" form="form" class="accept">CONFIRM</button>
			</div>
		</dialog>
		`;

		this.shadowElement = shadowRoot;
		this.dialog = shadowRoot.querySelector("dialog");
		this.form = shadowRoot.querySelector("form");
	}

	set header (header) {
		this.shadowElement.querySelector("#prompt").innerText = header;
	}

	set formBody (formBody) {
		this.form.innerHTML = formBody;
	}
	
	set callback (callback) {
		this.dialog.addEventListener("close", async () => {
			await callback(this.dialog.returnValue, new FormData(this.form));
			document.querySelector("dialog-form").remove();
		});
	}
	show () {
		this.dialog.showModal();
	}
}

customElements.define("dialog-form", Dialog);