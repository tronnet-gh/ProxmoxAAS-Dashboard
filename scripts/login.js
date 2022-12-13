import {requestTicket, setTicket, ResponseError, NetworkError} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init (){
	let formSubmitButton = document.querySelector("#submit");
	let status = document.querySelector("#status");
	formSubmitButton.addEventListener("click", async (e) => {
		status.innerText = "";
		e.preventDefault();
		let form = document.querySelector("form");
		let formData = new FormData(form);
		try {
			status.innerText = "Authenticating...";
			let ticket = await requestTicket(formData.get("username"), formData.get("password"));
			setTicket(ticket.data.ticket);
			window.location.href = "index.html";
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