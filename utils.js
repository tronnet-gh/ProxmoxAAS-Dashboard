class ResponseError extends Error {
	constructor(message) {
		super(message);
		this.name = "ResponseError";
	}
}

class NetworkError extends Error {
	constructor(message) {
		super(message);
		this.name = "NetworkError";
	}
}

export async function requestTicket (username, password) {
	let response = await request("/access/ticket", "POST", {username: `${username}@pve`, password: password}, false);

	return response;
}

export function setTicket (ticket) {
	let d = new Date();
	d.setTime(d.getTime() + (2*60*60*1000));
	document.cookie = `PVEAuthCookie=${ticket}; path=/; expires=${d.toUTCString()}; domain=.tronnet.net`;
}

export async function request (path, method, body, auth = true) {
	let prms = new URLSearchParams(body);

	let content = {
		method: method,
		mode: "cors",
		credentials: "include",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		}
	}
	if(method === "POST") {
		content.body = prms.toString();
	}
	if(auth) {
		content.headers.Cookie = document.cookie;
	}

	let response = await fetch(`https://pve.tronnet.net/api2/json${path}`, content)
	.then((response) => {
		if (!response.ok) {
			throw new ResponseError(`recieved response status code ${response.status}`);
		}
		return response;
	})
	.catch((error) => {
		if (error instanceof ResponseError) {
			throw error;
		}
		throw new NetworkError(error);
	});

	let data = await response.json();
	return data;
}