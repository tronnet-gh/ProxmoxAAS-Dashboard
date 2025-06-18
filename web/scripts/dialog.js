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
