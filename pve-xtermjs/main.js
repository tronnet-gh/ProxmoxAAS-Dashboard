console.log('xtermjs: starting');

var states = {
    start:         1,
    connecting:    2,
    connected:     3,
    disconnecting: 4,
    disconnected:  5,
    reconnecting:  6,
};

var term,
    protocol,
    socketURL,
    socket,
    ticket,
    resize,
    ping,
    state = states.start,
    starttime = new Date();

let uridata = getURIData();

var type = uridata.type;
var vmid = uridata.vmid;
var vmname = uridata.name;
var nodename = uridata.node;

if (typeof(PVE) === 'undefined') PVE = {};
PVE.UserName = uridata.user;
PVE.CSRFPreventionToken = getCookie("CSRFPreventionToken");
PVE.url = uridata.url;

document.title = document.title.replace("{{ VMName }}", vmid).replace("{{ NodeName }}", nodename);

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(";");
	for(let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function getURIData () {
	let url = new URL(window.location.href);
	return Object.fromEntries(url.searchParams);
}

function updateState(newState, msg, code) {
    var timeout, severity, message;
    switch (newState) {
	case states.connecting:
	    message = "Connecting...";
	    timeout = 0;
	    severity = severities.warning;
	    break;
	case states.connected:
	    window.onbeforeunload = windowUnload;
	    message = "Connected";
	    break;
	case states.disconnecting:
	    window.onbeforeunload = undefined;
	    message = "Disconnecting...";
	    timeout = 0;
	    severity = severities.warning;
	    break;
	case states.reconnecting:
	    window.onbeforeunload = undefined;
	    message = "Reconnecting...";
	    timeout = 0;
	    severity = severities.warning;
	    break;
	case states.disconnected:
	    window.onbeforeunload = undefined;
	    switch (state) {
		case states.start:
		case states.connecting:
		case states.reconnecting:
		    message = "Connection failed";
		    timeout = 0;
		    severity = severities.error;
		    break;
		case states.connected:
		case states.disconnecting:
		    var time_since_started = new Date() - starttime;
		    timeout = 5000;
		    if (time_since_started > 5*1000 || type === 'shell') {
			message = "Connection closed";
		    } else {
			message = "Connection failed";
			severity = severities.error;
		    }
		    break;
		case states.disconnected:
		    // no state change
		    break;
		default:
		    throw "unknown state";
	    }
	    break;
	default:
	    throw "unknown state";
    }
    let msgArr = [];
    if (msg) {
	msgArr.push(msg);
    }
    if (code !== undefined) {
	msgArr.push(`Code: ${code}`);
    }
    if (msgArr.length > 0) {
	message += ` (${msgArr.join(', ')})`;
    }
    state = newState;
    showMsg(message, timeout, severity);
}

var terminalContainer = document.getElementById('terminal-container');
document.getElementById('status_bar').addEventListener('click', hideMsg);
document.getElementById('connect_btn').addEventListener('click', startGuest);
const fitAddon = new FitAddon.FitAddon();

createTerminal();

function startConnection(url, params, term) {
    API2Request({
	method: 'POST',
	params: params,
	url: url + '/termproxy',
	success: function(result) {
	    var port = encodeURIComponent(result.data.port);
	    ticket = result.data.ticket;
	    socketURL = protocol + "pve.tronnet.net" + ((location.port) ? (':' + location.port) : '') + '/api2/json' + url + '/vncwebsocket?port=' + port + '&vncticket=' + encodeURIComponent(ticket);

	    term.open(terminalContainer, true);
	    socket = new WebSocket(socketURL, 'binary');
	    socket.binaryType = 'arraybuffer';
	    socket.onopen = runTerminal;
	    socket.onclose = tryReconnect;
	    socket.onerror = tryReconnect;
	    updateState(states.connecting);
	},
	failure: function(msg) {
	    updateState(states.disconnected,msg);
	}
    });
}

function startGuest() {
    let api_type = type === 'kvm' ? 'qemu' : 'lxc';
    API2Request({
	method: 'POST',
	url: `/nodes/${nodename}/${api_type}/${vmid}/status/start`,
	success: function(result) {
	    showMsg('Guest started successfully', 0);
	    setTimeout(function() {
		location.reload();
	    }, 1000);
	},
	failure: function(msg) {
	    if (msg.match(/already running/)) {
		showMsg('Guest started successfully', 0);
		setTimeout(function() {
		    location.reload();
		}, 1000);
	    } else {
		updateState(states.disconnected,msg);
	    }
	}
    });
}

function createTerminal() {
    term = new Terminal(getTerminalSettings());
    term.loadAddon(fitAddon);

    term.onResize(function (size) {
	if (state === states.connected) {
	    socket.send("1:" + size.cols + ":" + size.rows + ":");
	}
    });

    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';

    var params = {};
    var url = '/nodes/' + nodename;
    switch (type) {
	case 'kvm':
	    url += '/qemu/' + vmid;
	    break;
	case 'lxc':
	    url += '/lxc/' + vmid;
	    break;
	case 'upgrade':
	    params.cmd = 'upgrade';
	    break;
	case 'cmd':
	    params.cmd = decodeURI(cmd);
	    if (cmdOpts !== undefined && cmdOpts !== null && cmdOpts !== "") {
		params['cmd-opts'] = decodeURI(cmdOpts);
	    }
	    break;
    }
    if (type === 'kvm' || type === 'lxc') {
	API2Request({
	    method: 'GET',
	    url: `${url}/status/current`,
	    success: function(result) {
		if (result.data.status === 'running') {
		    startConnection(url, params, term);
		} else {
		    document.getElementById('connect_dlg').classList.add('pve_open');
		}
	    },
	    failure: function(msg) {
		updateState(states.disconnected, msg);
	    },
	});
    } else {
	startConnection(url, params, term);
    }
}

function runTerminal() {
    socket.onmessage = function(event) {
	var answer = new Uint8Array(event.data);
	if (state === states.connected) {
	    term.write(answer);
	} else if(state === states.connecting) {
	    if (answer[0] === 79 && answer[1] === 75) { // "OK"
		updateState(states.connected);
		term.write(answer.slice(2));
	    } else {
		socket.close();
	    }
	}
    };

    term.onData(function(data) {
	if (state === states.connected) {
	    socket.send("0:" + unescape(encodeURIComponent(data)).length.toString() + ":" +  data);
	}
    });

    ping = setInterval(function() {
	socket.send("2");
    }, 30*1000);

    window.addEventListener('resize', function() {
	clearTimeout(resize);
	resize = setTimeout(function() {
	    // done resizing
	    fitAddon.fit();
	}, 250);
    });

    socket.send(PVE.UserName + ':' + ticket + "\n");

    // initial focus and resize
    setTimeout(function() {
	term.focus();
	fitAddon.fit();
    }, 250);
}

function getLxcStatus(callback) {
    API2Request({
	method: 'GET',
	url: '/nodes/' + nodename + '/lxc/' + vmid + '/status/current',
	success: function(result) {
	    if (typeof callback === 'function') {
		callback(true, result);
	    }
	},
	failure: function(msg) {
	    if (typeof callback === 'function') {
		callback(false, msg);
	    }
	}
    });
}

function checkMigration() {
    var apitype = type;
    if (apitype === 'kvm') {
	apitype = 'qemu';
    }
    API2Request({
	method: 'GET',
	params: {
	    type: 'vm'
	},
	url: '/cluster/resources',
	success: function(result) {
	    // if not yet migrated , wait and try again
	    // if not migrating and stopped, cancel
	    // if started, connect
	    result.data.forEach(function(entity) {
		if (entity.id === (apitype + '/' + vmid)) {
		    var started = entity.status === 'running';
		    var migrated = entity.node !== nodename;
		    if (migrated) {
			if (started) {
			    // goto different node
			    location.href = '?console=' + type +
				'&xtermjs=1&vmid=' + vmid + '&vmname=' +
				vmname + '&node=' + entity.node;
			} else {
			    // wait again
			    updateState(states.reconnecting, 'waiting for migration to finish...');
			    setTimeout(checkMigration, 5000);
			}
		    } else {
			if (type === 'lxc') {
			    // we have to check the status of the
			    // container to know if it has the
			    // migration lock
			    getLxcStatus(function(success, result) {
				if (success) {
				    if (result.data.lock === 'migrate') {
					// still waiting
					updateState(states.reconnecting, 'waiting for migration to finish...');
					setTimeout(checkMigration, 5000);
				    } else if (started) {
					// container was rebooted
					location.reload();
				    } else {
					stopTerminal();
				    }
				} else {
				    // probably the status call failed because
				    // the ct is already somewhere else, so retry
				    setTimeout(checkMigration, 1000);
				}
			    });
			} else if (started) {
			    // this happens if we have old data in
			    // /cluster/resources, or the connection
			    // disconnected, so simply try to reload here
			    location.reload();
			} else if (type === 'kvm') {
			    // it seems the guest simply stopped
			    stopTerminal();
			}
		    }

		    return;
		}
	    });
	},
	failure: function(msg) {
	    errorTerminal({msg: msg});
	}
    });
}

function tryReconnect(event) {
    var time_since_started = new Date() - starttime;
    var type = getQueryParameter('console');
    if (time_since_started < 5*1000 || type === 'shell' || type === 'cmd') { // 5 seconds
	stopTerminal(event);
	return;
    }

    updateState(states.disconnecting, 'Detecting migration...');
    setTimeout(checkMigration, 5000);
}

function clearEvents() {
    term.onResize(() => {});
    term.onData(() => {});
}

function windowUnload(e) {
    let message = "Are you sure you want to leave this page?";

    e = e || window.event;
    if (e) {
	e.returnValue = message;
    }

    return message;
}

function stopTerminal(event) {
    event = event || {};
    clearEvents();
    clearInterval(ping);
    socket.close();
    updateState(states.disconnected, event.reason, event.code);
}

function errorTerminal(event) {
    even = event || {};
    clearEvents();
    clearInterval(ping);
    socket.close();
    term.dispose();
    updateState(states.disconnected, event.msg, event.code);
}
