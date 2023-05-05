export function dialog (header, body, callback = async (result, form) => {}) {
	let dialog = document.createElement("dialog");
	dialog.innerHTML = `
		<p class="w3-large" id="prompt" style="text-align: center;"></p>
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form"></form>
		<div class="w3-center w3-container">
			<button value="cancel" form="form" class="w3-button w3-margin" style="background-color: #f00;" formnovalidate>CANCEL</button>
			<button value="confirm" form="form" class="w3-button w3-margin" style="background-color: #0f0;">CONFIRM</button>
		</div>
	`;
	dialog.className = "w3-container w3-card w3-border-0";
	dialog.querySelector("#prompt").innerText = header;
	dialog.querySelector("form").innerHTML = body;

	document.body.append(dialog);
	dialog.showModal();

	dialog.addEventListener("close", async () => {
		await callback(dialog.returnValue, new FormData(dialog.querySelector("form")));
		dialog.parentElement.removeChild(dialog);
	});

	return dialog;
}

export function alert (message) {
	let dialog = document.createElement("dialog");
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
	})

	return dialog;
}