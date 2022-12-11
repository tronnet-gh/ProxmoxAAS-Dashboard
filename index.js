window.addEventListener("DOMContentLoaded", init);

async function init () {
	let cookie = document.cookie;
	if(cookie === '') {
		let username = prompt("username: ");
		let password = prompt("password: ")
		let ticket = await requestTicket(username, password);
		setTicket(ticket.data.ticket);
	}

	let nodes = await request("/nodes", "GET", null);
	console.log(nodes);
}

async function requestTicket (username, password) {
	let prms = new URLSearchParams({username: `${username}@pve`, password: password});
	let response = await fetch("https://pve.tronnet.net/api2/json/access/ticket", {
		method: "POST",
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: prms.toString()
	});
	let data = await response.json();
	return data;
}

async function request (path, method, body) {
	let prms = new URLSearchParams(body);
	let response = await fetch(`https://pve.tronnet.net/api2/json${path}`, {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Cookie": document.cookie
		}
	});
	if(method == "POST") {
		response.body = prms.toString();
	}
	let data = await response.json();
	return data;
}

function setTicket (ticket) {
	let d = new Date();
	d.setTime(d.getTime() + (2*60*60*1000));
	document.cookie = `PVEAuthCookie=${ticket}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net`;
}