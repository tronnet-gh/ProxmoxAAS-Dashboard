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
