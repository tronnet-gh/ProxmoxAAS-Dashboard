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
		<label for="name">Name</label>
		<input name="name" id="name" required></input>
		<label for="vmid">ID</label>
		<input name="vmid" id="vmid" type="number" required></input>
		<label for="cpu">Cores</label>
		<input name="cpu" id="cpu" type="number" min="1" max="8192" required></input>
		<label for="ram">Memory</label>
		<input name="ram" id="ram" type="number" min="16", step="1" required></input>
		<fieldset class="none" id="container-specific" style="grid-column: 1 / span 2; margin-top: 10px;">
			<legend>Container Options</legend>
			<div class="input-grid" style="grid-template-columns: auto 1fr;">
				<label for="swap">Swap</label>
				<input name="swap" id="swap" type="number" min="0" step="1" required disabled></input>				
				<label for="template-storage">Template Storage</label>
				<select name="template-storage" id="template-storage" required disabled></select>
				<label for="template-storage">Template Image</label>
				<select name="template-image" id="template-image" required disabled></select>
				<label for="template-storage">ROOTFS Storage</label>
				<select name="rootfs-storage" id="rootfs-storage" required disabled></select>
				<label for="template-size">ROOTFS Size (GiB)</label>
				<input name="template-size" id="template-size" type="number" min="0" max="131072" required disabled></input>
			</div>
		</fieldset>
	`;

	let typeSelect = dialog.shadowRoot.querySelector("#type");
	typeSelect.selectedIndex = -1;
	typeSelect.addEventListener("change", () => {
		if(typeSelect.value === "qemu") {
			dialog.shadowRoot.querySelectorAll("#container-specific input").forEach((element) => {element.disabled = true});
			dialog.shadowRoot.querySelectorAll("#container-specific select").forEach((element) => {element.disabled = true});
			dialog.shadowRoot.querySelector("#container-specific").classList.add("none");
		}
		else {
			dialog.shadowRoot.querySelectorAll("#container-specific input").forEach((element) => {element.disabled = false});
			dialog.shadowRoot.querySelectorAll("#container-specific select").forEach((element) => {element.disabled = false});
			dialog.shadowRoot.querySelector("#container-specific").classList.remove("none");
		}
	});

	let vmidInput = dialog.shadowRoot.querySelector("#vmid");
	//vmidInput.min = 200;
	//vmidInput.max = 299;

	dialog.callback = async (result, form) => {
		if (result === "confirm") {

		}
	}

	dialog.show();
}