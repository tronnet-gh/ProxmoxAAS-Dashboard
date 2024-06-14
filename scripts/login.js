import { requestTicket, goToPage, deleteAllCookies, requestPVE, setTitleAndHeader, setAppearance } from "./utils.js";
import { alert } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();
	setTitleAndHeader();
	await deleteAllCookies();
	const formSubmitButton = document.querySelector("#submit");
	const realms = await requestPVE("/access/domains", "GET");
	const realmSelect = document.querySelector("#realm");
	realms.data.forEach((element) => {
		realmSelect.add(new Option(element.comment, element.realm));
		if ("default" in element && element.default === 1) {
			realmSelect.value = element.realm;
		}
	});
	formSubmitButton.addEventListener("click", async (e) => {
		e.preventDefault();
		const form = document.querySelector("form");
		const formData = new FormData(form);

		formSubmitButton.innerText = "Authenticating...";
		const ticket = await requestTicket(formData.get("username"), formData.get("password"), formData.get("realm"));
		if (ticket.status === 200) {
			formSubmitButton.innerText = "LOGIN";
			goToPage("index.html");
		}
		else if (ticket.status === 401) {
			alert("Authenticaton failed.");
			formSubmitButton.innerText = "LOGIN";
		}
		else if (ticket.status === 408) {
			alert("Network error.");
			formSubmitButton.innerText = "LOGIN";
		}
		else {
			alert("An error occured.");
			formSubmitButton.innerText = "LOGIN";
			console.error(ticket.error);
		}
	});
}
