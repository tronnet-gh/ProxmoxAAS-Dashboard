/**
 * Spawn modal dialog from template node. Assumes the following structure:
 * <template>
 * <dialog>
 * <p id="prompt"></p>
 * <div id="body">
 * <form id="form"> ... </form>
 * </div>
 * <div id="controls">
 * <button value="..." form="form"
 * <button value="..." form="form"
 * ...
 * </div>
 * </dialog>
 * </template>
 * Where prompt is the modal dialog's prompt or header,
 * body contains an optional form or other information,
 * and controls contains a series of buttons which controls the form
 */
export function dialog (template, onclose = async (result, form) => { }) {
	const dialog = template.content.querySelector("dialog").cloneNode(true);
	document.body.append(dialog);
	dialog.addEventListener("close", async () => {
		const formElem = dialog.querySelector("form");
		const formData = formElem ? new FormData(formElem) : null;
		await onclose(dialog.returnValue, formData);
		formElem.reset();
		dialog.close();
		dialog.parentElement.removeChild(dialog);
	});
	if (!dialog.querySelector("form")) {
		for (const control of dialog.querySelector("#controls").childNodes) {
			control.addEventListener("click", async (e) => {
				e.preventDefault();
				dialog.close(e.target.value);
			});
		}
	}
	document.body.append(dialog);
	dialog.showModal();
	return dialog;
}

export function alert (message) {
	const dialog = document.querySelector("#alert-dialog");
	if (dialog == null) {
		const dialog = document.createElement("dialog");
		dialog.id = "alert-dialog";
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
	else {
		console.error("Attempted to create a new alert while one already exists!");
		return null;
	}
}

class ErrorDialog extends HTMLElement {
	shadowRoot = null;
	dialog = null;
	errors = null;

	constructor () {
		super();
		this.shadowRoot = this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<link rel="stylesheet" href="css/form.css">
			<style>
				#errors {
					margin-bottom: 0px; 
					max-height: 20lh; 
					min-height: 20lh; 
					overflow-y: scroll;
				}
				#errors * {
					margin: 0px;
				}
			</style>
			<dialog class="w3-container w3-card w3-border-0">
				<form method="dialog">
					<p class="w3-large" id="prompt" style="text-align: center;">Error</p>
					<div id="errors" class="flex column-reverse"></div>
					<div class="w3-center" id="controls">
						<button class="w3-button w3-margin" type="submit" value="ok">OK</button>
						<button class="w3-button w3-margin" type="submit" value="copy">Copy</button>
					</div>
				</form>
			</dialog>
		`;
		this.dialog = this.shadowRoot.querySelector("dialog");
		this.errors = this.shadowRoot.querySelector("#errors");

		for (const control of this.shadowRoot.querySelector("#controls").childNodes) {
			control.addEventListener("click", async (e) => {
				e.preventDefault();
				this.dialog.close(e.target.value);
			});
		}

		this.dialog.addEventListener("close", () => {
			if (this.dialog.returnValue === "ok") {}
			else if (this.dialog.returnValue === "copy") {
				let errors = "";
				for (const error of this.errors.childNodes) {
					errors += `${error.innerText}\n`;
				}
				navigator.clipboard.writeText(errors);
			}
			this.parentElement.removeChild(this);
		});
	}

	appendError (error) {
		error = `${(new Date()).toUTCString()}: ${error}`;
		const p = document.createElement("p");
		p.innerText = error;
		this.errors.appendChild(p);
	}

	showModal () {
		this.dialog.showModal();
	}
}

customElements.define("error-dialog", ErrorDialog);

export function error (message) {
	let dialog = document.querySelector("error-dialog");
	if (dialog == null) {
		dialog = document.createElement("error-dialog");
		document.body.append(dialog);
		dialog.appendError(message);
		dialog.showModal();
	}
	else {
		dialog.appendError(message);
		dialog.showModal();
	}
	return dialog;
}
