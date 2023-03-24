import {requestTicket, setTicket, ResponseError, NetworkError, goToPage, deleteAllCookies, requestPVE} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init (){
	deleteAllCookies();
	let formSubmitButton = document.querySelector("#submit");
	let status = document.querySelector("#status");
	let realms = await requestPVE("/access/domains", "GET");
	let realmSelect = document.querySelector("#realm");
	realms.data.forEach((element) => {
		realmSelect.add(new Option(element.comment, element.realm));
	});
	formSubmitButton.addEventListener("click", async (e) => {
		status.innerText = "";
		status.style.color = "#000000";
		e.preventDefault();
		let form = document.querySelector("form");
		let formData = new FormData(form);
		try {
			status.innerText = "Authenticating...";
			let ticket = await requestTicket(formData.get("username"), formData.get("password"), formData.get("realm"));
			setTicket(ticket.data.ticket, ticket.data.CSRFPreventionToken, formData.get("username"));
			status.innerText = "Authentication successful!"
			status.style.color = "#00ff00";
			goToPage("index.html");
		}
		catch (error) {
			if(error instanceof ResponseError) { // response error is usually 401 auth failed
				status.innerText = "Authentication failed.";
				status.style.color = "#ff0000";
			}
			else if (error instanceof NetworkError) {
				status.innerText = "Encountered a network error.";
				status.style.color = "#ff0000";
			}
			else {
				status.innerText = "An error occured.";
				status.style.color = "#ff0000";
				console.error(error);
			}
		}
	});
}