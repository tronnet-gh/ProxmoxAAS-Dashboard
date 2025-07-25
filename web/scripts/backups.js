import { requestAPI, getURIData, setAppearance, requestDash } from "./utils.js";
import { alert, dialog } from "./dialog.js";

window.addEventListener("DOMContentLoaded", init);

let node;
let type;
let vmid;

async function init () {
	setAppearance();

	const uriData = getURIData();
	node = uriData.node;
	type = uriData.type;
	vmid = uriData.vmid;

	document.querySelector("#backup-add").addEventListener("click", handleBackupAddButton);
}

class BackupCard extends HTMLElement {
	shadowRoot = null;

	constructor () {
		super();
		const internals = this.attachInternals();
		this.shadowRoot = internals.shadowRoot;

		const editButton = this.shadowRoot.querySelector("#edit-btn");
		if (editButton.classList.contains("clickable")) {
			editButton.onclick = this.handleEditButton.bind(this);
			editButton.onkeydown = (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.editButton();
				}
			};
		}

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		if (deleteButton.classList.contains("clickable")) {
			deleteButton.onclick = this.handleDeleteButton.bind(this);
			deleteButton.onkeydown = (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.handleDeleteButton();
				}
			};
		}

		const restoreButton = this.shadowRoot.querySelector("#restore-btn");
		if (restoreButton.classList.contains("clickable")) {
			restoreButton.onclick = this.handleRestoreButton.bind(this);
			restoreButton.onkeydown = (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.handleRestoreButton();
				}
			};
		}
	}

	get volid () {
		return this.dataset.volid;
	}

	async handleEditButton () {
		const template = this.shadowRoot.querySelector("#edit-dialog");
		dialog(template, async (result, form) => {
			if (result === "confirm") {
				const body = {
					volid: this.volid,
					notes: form.get("notes")
				};
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/backup/notes`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to edit backup but got: ${result.error}`);
				}
				refreshBackups();
			}
		});
	}

	async handleDeleteButton () {
		const template = this.shadowRoot.querySelector("#delete-dialog");
		dialog(template, async (result, form) => {
			if (result === "confirm") {
				const body = {
					volid: this.volid
				};
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/backup`, "DELETE", body);
				if (result.status !== 200) {
					alert(`Attempted to delete backup but got: ${result.error}`);
				}
				refreshBackups();
			}
		});
	}

	async handleRestoreButton () {
		const template = this.shadowRoot.querySelector("#restore-dialog");
		dialog(template, async (result, form) => {
			if (result === "confirm") {
				const body = {
					volid: this.volid
				};
				const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/backup/restore`, "POST", body);
				if (result.status !== 200) {
					alert(`Attempted to delete backup but got: ${result.error}`);
				}
				refreshBackups();
			}
		});
	}
}

customElements.define("backup-card", BackupCard);

async function getBackupsFragment () {
	return await requestDash(`/backups/backups?node=${node}&type=${type}&vmid=${vmid}`, "GET");
}

async function refreshBackups () {
	let backups = await getBackupsFragment();
	if (backups.status !== 200) {
		alert("Error fetching backups.");
	}
	else {
		backups = backups.data;
		const container = document.querySelector("#backups-container");
		container.setHTMLUnsafe(backups);
	}
}

async function handleBackupAddButton () {
	const template = document.querySelector("#create-backup-dialog");
	dialog(template, async (result, form) => {
		if (result === "confirm") {
			const body = {
				notes: form.get("notes")
			};
			const result = await requestAPI(`/cluster/${node}/${type}/${vmid}/backup`, "POST", body);
			if (result.status !== 200) {
				alert(`Attempted to create backup but got: ${result.error}`);
			}
			refreshBackups();
		}
	});
}
