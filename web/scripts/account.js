import { dialog } from "./dialog.js";
import { requestAPI, setAppearance } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();

	document.querySelector("#change-password").addEventListener("click", handlePasswordChangeForm);
}

function handlePasswordChangeForm () {
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
		<label for="new-password">New Password</label>
		<input class="w3-input w3-border" id="new-password" name="new-password" type="password"required>
		<label for="confirm-password">Confirm Password</label>
		<input class="w3-input w3-border" id="confirm-password" name="confirm-password" type="password" required>
		</form>
	`;
	const d = dialog("Change Password", body, async (result, form) => {
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
