import {requestTicket, setTicket, ResponseError, NetworkError, goToPage, deleteAllCookies, requestPVE} from "./utils.js";
import {alert} from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init (){
	deleteAllCookies();
	let formSubmitButton = document.querySelector("#submit");
	let realms = await requestPVE("/access/domains", "GET");
	let realmSelect = document.querySelector("#realm");
	realms.data.forEach((element) => {
		realmSelect.add(new Option(element.comment, element.realm));
		if("default" in element && element.default === 1){
			realmSelect.value = element.realm;
		}
	});
	formSubmitButton.addEventListener("click", async (e) => {
		e.preventDefault();
		let form = document.querySelector("form");
		let formData = new FormData(form);
		try {
			formSubmitButton.innerText = "Authenticating...";
			let ticket = await requestTicket(formData.get("username"), formData.get("password"), formData.get("realm"));
			setTicket(ticket.data.ticket, ticket.data.CSRFPreventionToken, formData.get("username"));
			formSubmitButton.innerText = "LOGIN";		
			goToPage("index.html");
		}
		catch (error) {
			if(error instanceof ResponseError) { // response error is usually 401 auth failed
				alert("Authenticaton failed.");
				formSubmitButton.innerText = "LOGIN";
			}
			else if (error instanceof NetworkError) {
				alert("Network error.");
				formSubmitButton.innerText = "LOGIN";
			}
			else {
				alert("An error.");
				formSubmitButton.innerText = "LOGIN";
				console.error(error);
			}
		}
	});
}