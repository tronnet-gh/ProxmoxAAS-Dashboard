import {requestPVE, goToPage, deleteAllCookies} from "./utils.js";
import { Dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	await populateInstances();

	let instances = document.querySelector("nav #instances");
	instances.addEventListener("click", () => {
		goToPage("index.html");
	});

	let logout = document.querySelector("nav #logout");
	logout.addEventListener("click", () => {
		deleteAllCookies();
		goToPage("login.html");
	});

	let addInstanceBtn = document.querySelector("#instance-add");
	addInstanceBtn.addEventListener("click", handleInstanceAdd);
}

async function populateInstances () {
	let cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let resources = await requestPVE("/cluster/resources", "GET", null);

	let instanceContainer = document.getElementById("instance-container")

	let instances = [];

	resources.data.forEach((element) => {
		if (element.type === "lxc" || element.type === "qemu") {
			let nodeName = element.node;
			let nodeStatus = resources.data.find(item => item.node === nodeName && item.type === "node").status;
			element.node = {name: nodeName, status: nodeStatus};
			instances.push(element);
		}
	});

	instances.sort((a, b) => (a.vmid > b.vmid) ? 1 : -1);

	instanceContainer.innerText = "";
	for(let i = 0; i < instances.length; i++) {
		let newInstance = document.createElement("instance-article");
		newInstance.data = instances[i];
		instanceContainer.append(newInstance);
	}
}

async function handleInstanceAdd () {
	let dialog = document.createElement("dialog-form");
	document.body.append(dialog);
	
	dialog.header = "Create New Instance";

	dialog.formBody = `
		<label for="type">Instance Type</label>
		<select name="type" id="type" required>
			<option value="lxc">Container</option>
			<option value="qemu">Virtual Machine</option>
		</select>
		<label for="cpu">Cores</label>
		<input name="cpu" id="cpu" type="number" min="1" max="8192" required></input>
		<label for="ram">Memory</label>
		<input name="ram" id="ram" type="number" min="16", step="1" required></input>
		<label for="swap" disabled>Swap</label>
		<input name="swap" id="swap" type="number" min="0" step="1" required disabled></input>
	`;

	let typeSelect = dialog.shadowRoot.querySelector("#type");
	typeSelect.selectedIndex = -1;
	typeSelect.addEventListener("change", () => {
		if(typeSelect.value === "qemu") {
			dialog.shadowRoot.querySelector(`label[for="swap"]`).disabled = true;
			dialog.shadowRoot.querySelector("#swap").disabled = true;
		}
		else {
			dialog.shadowRoot.querySelector(`label[for="swap"]`).disabled = false;
			dialog.shadowRoot.querySelector("#swap").disabled = false;
		}
	});

	dialog.callback = async (result, form) => {
		if (result === "confirm") {

		}
	}

	dialog.show();
}