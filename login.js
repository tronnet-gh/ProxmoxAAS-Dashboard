import {requestTicket, setTicket} from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

function init (){
	let formSubmitButton = document.querySelector("#submit");
	formSubmitButton.addEventListener("click", loginFormSubmitHandler);
}

async function loginFormSubmitHandler () {
	let form = document.querySelector("form");
	let formData = new FormData(form);
	try {
		let ticket = await requestTicket(formData.username, formData.password);
		await setTicket(ticket);
		window.location.href = "index.html";
	}
	catch (error) {
		console.log(error);
	}
}