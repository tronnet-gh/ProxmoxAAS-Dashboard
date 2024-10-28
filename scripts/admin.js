import { setTitleAndHeader, setAppearance, requestAPI, goToPage, isEmpty } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();
	setTitleAndHeader();

	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	document.querySelector("#user-add").addEventListener("click", handleUserAdd);
	document.querySelector("#group-add").addEventListener("click", handleGroupAdd);

	await getUsers();
	await getGroups();
}

async function getUsers () {
	const users = (await requestAPI("/access/users")).users;
	const usersContainer = document.querySelector("#users-container");
	for (const user of Object.keys(users)) {
		const newUserCard = document.createElement("user-card");
		users[user].username = user;
		newUserCard.data = users[user];
		usersContainer.append(newUserCard);
	}
}

async function getGroups () {
	const groups = (await requestAPI("/access/groups")).groups;
	const groupsContainer = document.querySelector("#groups-container");
	for (const group of Object.keys(groups)) {
		const newGroupCard = document.createElement("group-card");
		groups[group].groupname = group;
		newGroupCard.data = groups[group];
		groupsContainer.append(newGroupCard);
	}
}

class UserCard extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<style>
				* {
					margin: 0;
				}
				p {
					width: 100%;
				}
			</style>
			<div class="w3-row" style="margin-top: 1em; margin-bottom: 1em;">
				<p class="w3-col l4 m4 s6" id="user-name">
				<p class="w3-col l4 m4 w3-hide-small" id="user-groups">
				<p class="w3-col l2 w3-hide-medium w3-hide-small" id="user-admin">
				<div class="w3-col l2 m4 s6 flex row nowrap" style="height: 1lh;">
					<svg class="clickable" id="config-btn" role="img" aria-label="Edit User"><use href="images/actions/user/config.svg#symb"></use></svg>
					<svg class="clickable" id="delete-btn" role="img" aria-label="Delete User"><use href="images/actions/delete-active.svg#symb"></use></svg>
				</div>
			</div>
		`;

		const configButton = this.shadowRoot.querySelector("#config-btn");
		configButton.onclick = this.handleConfigButton.bind(this);

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		deleteButton.onclick = this.handleDeleteButton.bind(this);
	}

	get data () {
		return {
			username: this.username,
			groups: this.groups,
			admin: this.admin
		};
	}

	set data (data) {
		this.username = data.username;
		this.groups = this.#getGroupsFromAttribute(data.attributes.memberOf);
		this.admin = data.cluster.admin;
		this.update();
	}

	#getGroupsFromAttribute (attribute) {
		return Array.from(attribute, (e) => e.split("cn=")[1].split(",")[0]);
	}

	update () {
		const nameParagraph = this.shadowRoot.querySelector("#user-name");
		nameParagraph.innerText = this.username;

		const groupsParagraph = this.shadowRoot.querySelector("#user-groups");
		if (isEmpty(this.groups)) {
			groupsParagraph.innerHTML = "&nbsp;";
		}
		else {
			groupsParagraph.innerText = this.groups.toString();
		}

		const adminParagraph = this.shadowRoot.querySelector("#user-admin");
		adminParagraph.innerText = this.admin;
	}

	handleConfigButton () {
		goToPage("user.html", { username: this.username });
	}

	handleDeleteButton () {
		// TODO
	}
}

class GroupCard extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<link rel="stylesheet" href="modules/w3.css">
			<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
			<link rel="stylesheet" href="css/style.css">
			<style>
				* {
					margin: 0;
				}
			</style>
			<div class="w3-row" style="margin-top: 1em; margin-bottom: 1em;">
				<p class="w3-col l4 m4 s6" id="group-name">
				<p class="w3-col l6 m4 w3-hide-small" id="group-members">
				<div class="w3-col l2 m4 s6 flex row nowrap" style="height: 1lh;">
					<svg class="clickable" id="config-btn" role="img" aria-label="Edit User"><use href="images/actions/user/config.svg#symb"></use></svg>
					<svg class="clickable" id="delete-btn" role="img" aria-label="Delete User"><use href="images/actions/delete-active.svg#symb"></use></svg>
				</div>
			</div>
		`;

		const configButton = this.shadowRoot.querySelector("#config-btn");
		configButton.onclick = this.handleConfigButton.bind(this);

		const deleteButton = this.shadowRoot.querySelector("#delete-btn");
		deleteButton.onclick = this.handleDeleteButton.bind(this);
	}

	get data () {
		return {
			groupname: this.groupname,
			members: this.members
		};
	}

	set data (data) {
		this.groupname = data.groupname;
		this.members = this.#getMembersFromAttribute(data.attributes.member);
		this.update();
	}

	#getMembersFromAttribute (attribute) {
		const filteredGroups = attribute.filter(e => e !== "");
		return Array.from(filteredGroups, (e) => e.split("uid=")[1].split(",")[0]);
	}

	update () {
		const nameParagraph = this.shadowRoot.querySelector("#group-name");
		nameParagraph.innerText = this.groupname;

		const membersParagraph = this.shadowRoot.querySelector("#group-members");
		membersParagraph.innerText = `${this.members.toString()}`;
	}

	handleConfigButton () {
		// TODO
	}

	handleDeleteButton () {
		// TODO
	}
}

customElements.define("user-card", UserCard);
customElements.define("group-card", GroupCard);

function handleUserAdd () {
	// TODO
}

function handleGroupAdd () {
	// TODO
}
