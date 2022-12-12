export async function requestTicket (username, password) {
	let prms = new URLSearchParams({username: `${username}@pve`, password: password});
	let response = await fetch("https://pve.tronnet.net/api2/json/access/ticket", {
		method: "POST",
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: prms.toString()
	})
	.then((response) => {
		if (!response.ok) {
			throw new Error('Network response was not OK');
		}
		return response;
	})
	.catch((error) => {
		console.error('There has been a problem with your fetch operation:', error);
	});
	let data = await response.json();
	return data;
}

export function setTicket (ticket) {
	let d = new Date();
	d.setTime(d.getTime() + (2*60*60*1000));
	document.cookie = `PVEAuthCookie=${ticket}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net`;
}

export async function request (path, method, body) {
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