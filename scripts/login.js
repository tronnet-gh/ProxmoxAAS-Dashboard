import {requestTicket, setTicket, ResponseError, NetworkError, goToPage, deleteAllCookies} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init (){
	deleteAllCookies();
	let formSubmitButton = document.querySelector("#submit");
	let status = document.querySelector("#status");
	formSubmitButton.addEventListener("click", async (e) => {
		status.innerText = "";
		status.style.color = "#000000";
		e.preventDefault();
		let form = document.querySelector("form");
		let formData = new FormData(form);
		try {
			status.innerText = "Authenticating...";
			let ticket = await requestTicket(formData.get("username"), formData.get("password"));
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