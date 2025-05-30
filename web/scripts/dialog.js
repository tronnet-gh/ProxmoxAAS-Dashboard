/**
 * Custom modal dialog with form support. Assumes the following structure:
 * <modal-dialog><template shadowrootmode="open">
 * <p id="prompt"></p>
 * <div id="body">
 * <form id="form"> ... </form>
 * </div>
 * <div id="controls">
 * <button value="..." form=""
 * </div>
 * </modal-dialog></template>
 * Where prompt is the modal dialog's prompt or header,
 * body contains an optional form or other information,
 * and controls contains a series of buttons which controls the form
 */
class ModalDialog extends HTMLElement {
	shadowRoot = null;
	dialog = null;

	constructor () {
		super();
		// setup shadowDOM
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;
		this.dialog = this.shadowRoot.querySelector("dialog");
	}

	showModal () {
		this.dialog.showModal();
	}

	querySelector (query) {
		return this.shadowRoot.querySelector(query);
	}

	querySelectorAll (query) {
		return this.shadowRoot.querySelectorAll(query);
	}

	// it is usually not safe to call this on each dialog invocation
	setOnClose (callback = (result, form) => {}) {
		this.dialog.addEventListener("close", () => {
			const formElem = this.dialog.querySelector("form");
			const formData = formElem ? new FormData(formElem) : null;
			callback(this.dialog.returnValue, formData);
			formElem.reset();
			this.dialog.close();
		});
	}
}

customElements.define("modal-dialog", ModalDialog);

export function dialog (header, body, onclose = async (result, form) => { }) {
	const dialog = document.createElement("dialog");
	dialog.innerHTML = `
		<p class="w3-large" id="prompt" style="text-align: center;"></p>
		<div id="body"></div>
		<div class="w3-center w3-container">
			<button id="cancel" value="cancel" form="form" class="w3-button w3-margin" style="background-color: var(--negative-color, #f00); color: var(--lightbg-text-color, black);" formnovalidate>CANCEL</button>
			<button id="confirm" value="confirm" form="form" class="w3-button w3-margin" style="background-color: var(--positive-color, #0f0); color: var(--lightbg-text-color, black);">CONFIRM</button>
		</div>
	`;
	dialog.className = "w3-container w3-card w3-border-0";
	dialog.querySelector("#prompt").innerText = header;
	dialog.querySelector("#body").innerHTML = body;
	dialog.addEventListener("close", async () => {
		const formElem = dialog.querySelector("form");
		const formData = formElem ? new FormData(formElem) : null;
		await onclose(dialog.returnValue, formData);
		dialog.parentElement.removeChild(dialog);
	});
	if (!dialog.querySelector("form")) {
		dialog.querySelector("#confirm").addEventListener("click", async (e) => {
			e.preventDefault();
			dialog.close(e.target.value);
		});
		dialog.querySelector("#cancel").addEventListener("click", async (e) => {
			e.preventDefault();
			dialog.close(e.target.value);
		});
	}
	document.body.append(dialog);
	dialog.showModal();
	return dialog;
}

export function alert (message) {
	const dialog = document.createElement("dialog");
	dialog.innerHTML = `
		<form method="dialog">
			<p class="w3-center" style="margin-bottom: 0px;">${message}</p>
			<div class="w3-center">
				<button class="w3-button w3-margin" id="submit">OK</button>
			</div>
		</form>
	`;
	dialog.className = "w3-container w3-card w3-border-0";

	document.body.append(dialog);
	dialog.showModal();

	dialog.addEventListener("close", () => {
		dialog.parentElement.removeChild(dialog);
	});

	return dialog;
}
