export class Dialog extends HTMLElement {
	constructor () {
		super();
		let shadowRoot = this.attachShadow({mode: "open"});

		shadowRoot.innerHTML = `
		<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
		<link rel="stylesheet" href="css/style.css" type="text/css">
		<link rel="stylesheet" href="css/form.css" type="text/css">
		<dialog class="w3-container w3-card-4 w3-border-0">
			<p class="w3-large" id="prompt" style="text-align: center;"></p>
			<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form"></form>
			<div class="w3-center w3-container">
				<button value="cancel" form="form" class="w3-button w3-margin" style="background-color: #f00;" formnovalidate>CANCEL</button>
				<button value="confirm" form="form" class="w3-button w3-margin" style="background-color: #0f0;">CONFIRM</button>
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