export function dialog (header, body, onclose = async (result, form) => { }, validate = async (dialog, form) => {
	return true;
}) {
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
		let formData = null;
		if (formElem) {
			formData = new FormData(formElem);
		}
		await onclose(dialog.returnValue, formData);
		dialog.parentElement.removeChild(dialog);
	});
	dialog.querySelector("#confirm").addEventListener("click", async (e) => {
		e.preventDefault();
		let valid = true;
		const formElem = dialog.querySelector("form");
		if (formElem) {
			const form = new FormData(formElem);
			valid = await validate(dialog, form);
		}
		if (valid) {
			dialog.close(e.target.value);
		}
	});
	dialog.querySelector("#cancel").addEventListener("click", async (e) => {
		e.preventDefault();
		dialog.close(e.target.value);
	});
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
