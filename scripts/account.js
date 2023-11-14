import { dialog } from "./dialog.js";
import { requestAPI, goToPage, getCookie, setTitleAndHeader } from "./utils.js";

window.addEventListener("DOMContentLoaded", init);

const prefixes = {
	1024: [
		"",
		"Ki",
		"Mi",
		"Gi",
		"Ti"
	],
	1000: [
		"",
		"K",
		"M",
		"G",
		"T"
	]
};

async function init () {
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let resources = requestAPI("/user/dynamic/resources");
	let meta = requestAPI("/global/config/resources");
	let instances = requestAPI("/user/config/cluster");
	let nodes = requestAPI("/user/config/nodes");

	resources = await resources;
	meta = await meta;
	instances = await instances;
	nodes = await nodes;

	document.querySelector("#username").innerText = `Username: ${getCookie("username")}`;
	document.querySelector("#pool").innerText = `Pool: ${instances.pool}`;
	document.querySelector("#vmid").innerText = `VMID Range: ${instances.vmid.min} - ${instances.vmid.max}`;
	document.querySelector("#nodes").innerText = `Nodes: ${nodes.toString()}`;

	populateResources("#resource-container", meta, resources);

	document.querySelector("#change-password").addEventListener("click", handlePasswordChangeForm);
}

function populateResources (containerID, meta, resources) {
	if (resources instanceof Object) {
		const container = document.querySelector(containerID);
		Object.keys(meta).forEach((resourceType) => {
			if (meta[resourceType].display) {
				if (meta[resourceType].type === "list") {
					resources[resourceType].forEach((listResource) => {
						createResourceUsageChart(container, listResource.name, listResource.avail, listResource.used, listResource.max, null);
					});
				}
				else {
					createResourceUsageChart(container, meta[resourceType].name, resources[resourceType].avail, resources[resourceType].used, resources[resourceType].max, meta[resourceType]);
				}
			}
		});
	}
}

function createResourceUsageChart (container, resourceName, resourceAvail, resourceUsed, resourceMax, resourceUnitData) {
	const chart = document.createElement("resource-chart");
	container.append(chart);
	const maxStr = parseNumber(resourceMax, resourceUnitData);
	const usedStr = parseNumber(resourceUsed, resourceUnitData);
	const usedRatio = resourceUsed / resourceMax;
	const R = Math.min(usedRatio * 510, 255);
	const G = Math.min((1 - usedRatio) * 510, 255);
	const usedColor = `rgb(${R}, ${G}, 0)`;
	chart.data = {
		title: [resourceName, `Used ${usedStr} of ${maxStr}`],
		ariaLabel: `${resourceName} used ${usedStr} of ${maxStr}`,
		data: {
			labels: [
				"Used",
				"Available"
			],
			datasets: [{
				label: resourceName,
				data: [resourceUsed, resourceAvail],
				backgroundColor: [
					usedColor,
					"rgb(140, 140, 140)"
				],
				borderWidth: 0,
				hoverOffset: 4
			}]
		},
		breakpoint: 680
	};
	chart.style = "margin: 10px;";
}

function parseNumber (value, unitData) {
	if (!unitData) {
		return `${value}`;
	}
	const compact = unitData.compact;
	const multiplier = unitData.multiplier;
	const base = unitData.base;
	const unit = unitData.unit;
	value = multiplier * value;
	if (value <= 0) {
		return `0 ${unit}`;
	}
	else if (compact) {
		const exponent = Math.floor(Math.log(value) / Math.log(base));
		value = value / base ** exponent;
		const unitPrefix = prefixes[base][exponent];
		return `${value} ${unitPrefix}${unit}`;
	}
	else {
		return `${value} ${unit}`;
	}
}

function handlePasswordChangeForm () {
	const body = `
		<form method="dialog" class="input-grid" style="grid-template-columns: auto 1fr;" id="form">
			<label for="new-password">New Password</label>
			<input class="w3-input w3-border" type="password" id="new-password" name="new-password">
			<label for="confirm-password">Confirm Password</label>
			<input class="w3-input w3-border" type="password" id="confirm-password" name="confirm-password">
		</form>
		<p class="w3-large" id="error-message" style="text-align: center; color: var(--negative-color); margin-top: 0.5em; margin-bottom: 0;"></p>
	`;
	dialog("Change Password", body, async (result, form) => {
		if (result === "confirm") {
			const result = await requestAPI("/auth/password", "POST", { password: form.get("new-password") });
			if (result.status !== 200) {
				alert(result.error);
			}
		}
	}, (dialog, form) => {
		const pass = form.get("new-password");
		const conf = form.get("confirm-password");
		if (pass !== conf) {
			dialog.querySelector("#error-message").innerText = "Passwords must match";
			return false;
		}
		else {
			return true;
		}
	});
}
