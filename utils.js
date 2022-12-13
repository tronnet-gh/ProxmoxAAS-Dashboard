class ResponseError extends Error {
	constructor(message) {
		super(message);
		this.name = "ValidationError";
	}
}

class NetworkError extends Error {
	constructor(message) {
		super(message);
		this.name = "ValidationError";
	}
}

export async function requestTicket (username, password) {
	let prms = new URLSearchParams({username: `${username}@pve`, password: password});

	let content = {
		method: "POST",
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: prms.toString()
	}

	let response = await fetch("https://pve.tronnet.net/api2/json/access/ticket", content)
	.then((response) => {
		if (!response.ok) {
			throw new ResponseError(`recieved response status code ${response.status}`);
		}
		return response;
	})
	.catch((error) => {
		if (error instanceof AuthenticationError) {
			throw error;
		}
		throw new NetworkError(error);
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

	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Cookie": document.cookie
		}
	}
	if(method == "POST") {
		content.body = prms.toString();
	}

	let response = await fetch(`https://pve.tronnet.net/api2/json${path}`, content)
	.then((response) => {
		if (!response.ok) {
			throw new ResponseError(`recieved response status code ${response.status}`);
		}
		return response;
	})
	.catch((error) => {
		if (error instanceof AuthenticationError) {
			throw error;
		}
		throw new NetworkError(error);
	});

	let data = await response.json();
	return data;
}