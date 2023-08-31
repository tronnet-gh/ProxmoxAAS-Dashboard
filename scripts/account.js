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
	const resources = await requestAPI("/user/dynamic/resources");
	const instances = await requestAPI("/user/config/cluster");
	const nodes = await requestAPI("/user/config/nodes");
	document.querySelector("#username").innerText = `Username: ${getCookie("username")}`;
	document.querySelector("#pool").innerText = `Pool: ${instances.pool}`;
	document.querySelector("#vmid").innerText = `VMID Range: ${instances.vmid.min} - ${instances.vmid.max}`;
	document.querySelector("#nodes").innerText = `Nodes: ${nodes.toString()}`;
	buildResourceTable("#resource-container", resources);
}

function buildResourceTable (containerID, resources) {
	if (resources instanceof Object) {
		const container = document.querySelector(containerID);
		Object.keys(resources.resources).forEach((element) => {
			if (resources.resources[element].display) {
				if (resources.resources[element].type === "list") {
				}
				else {
					const chart = createResourceUsageChart(resources.resources[element].title, resources.avail[element], resources.used[element], resources.max[element], resources.resources[element]);
					container.append(chart);
				}
			}
		});
	}
}

function createResourceUsageChart (resourceName, resourceAvail, resourceUsed, resourceMax, resourceUnitData) {
	const container = document.createElement("div");
	// layout fits 6 resources per row on large screens
	// max width = (100% [parent] - 50px [5 flexbox col gap]) / 6
	container.style = "position: relative; min-width: 200px; width: 100%; max-width: calc((100% - 50px) / 6); aspect-ratio: 1;";
	const canvas = document.createElement("canvas");
	container.append(canvas);
	const maxStr = parseNumber(resourceMax, resourceUnitData);
	const usedStr = parseNumber(resourceUsed, resourceUnitData);
	const usedRatio = resourceUsed / resourceMax;
	const R = Math.min(usedRatio * 510, 255);
	const G = Math.min((1 - usedRatio) * 510, 255);
	const usedColor = `rgb(${R}, ${G}, 0)`;
	new Chart(canvas, {
		type: "pie",
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
		options: {
			plugins: {
				title: {
					display: true,
					position: "bottom",
					text: [resourceName, `Used ${usedStr} of ${maxStr}`],
					color: "white"
				},
				legend: {
					display: false
				}
			}
		}
	});
	canvas.role = "img";
	canvas.ariaLabel = `${resourceName} used ${usedStr} of ${maxStr}`;
	return container;
}

function parseNumber (value, unitData) {
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
