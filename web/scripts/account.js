import { requestAPI, setAppearance } from "./utils.js";
import { dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();

	document.querySelector("#change-password").addEventListener("click", handlePasswordChangeButton);
}

function handlePasswordChangeButton () {
	const template = document.querySelector("#change-password-dialog");
	const d = dialog(template, async (result, form) => {
		if (result === "confirm") {
			const result = await requestAPI("/access/password", "POST", { password: form.get("new-password") });
			if (result.status !== 200) {
				alert(`Attempted to change password but got: ${result.error}`);
			}
		}
	});

	const password = d.querySelector("#new-password");
	const confirmPassword = d.querySelector("#confirm-password");
	function validatePassword () {
		confirmPassword.setCustomValidity(password.value !== confirmPassword.value ? "Passwords Don't Match" : "");
	}
	password.addEventListener("change", validatePassword);
	confirmPassword.addEventListener("keyup", validatePassword);
}
