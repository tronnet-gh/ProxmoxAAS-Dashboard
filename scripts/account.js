import { dialog } from "./dialog.js";
import { requestAPI, goToPage, getCookie, setTitleAndHeader, setAppearance } from "./utils.js";

class ResourceChart extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
			<style>
				* {
					box-sizing: border-box;
					font-family: monospace;
				}
				figure {
					margin: 0;
				}
				div {
					max-width: 400px;
					aspect-ratio: 1 / 1;
				}
				figcaption {
					text-align: center;
					margin-top: 10px;
					display: flex;
					flex-direction: column;
				}
			</style>
			<style id="responsive-style" media="not all">
				figure {
					display: flex;
					align-items: center;
					flex-direction: row;
					flex-wrap: nowrap;
					justify-content: flex-start;
				}
				div {
					max-height: 1lh;
				}
				figcaption {
					margin: 0;
					margin-left: 10px;
					display: flex;
					flex-direction: row;
					gap: 1ch;
					font-size: small;
				}
			</style>
			<figure>
				<div>
					<canvas></canvas>
				</div>
				<figcaption></figcaption>
			</figure>
		`;
		this.responsiveStyle = this.shadowRoot.querySelector("#responsive-style");
		this.canvas = this.shadowRoot.querySelector("canvas");
		this.caption = this.shadowRoot.querySelector("figcaption");
	}

	set data (data) {
		for (const line of data.title) {
			this.caption.innerHTML += `<span>${line}</span>`;
		}

		this.canvas.role = "img";
		this.canvas.ariaLabel = data.ariaLabel;

		const chartData = {
			type: "pie",
			data: data.data,
			options: {
				plugins: {
					title: {
						display: false
					},
					legend: {
						display: false
					},
					tooltip: {
						enabled: true
					}
				},
				interaction: {
					mode: "nearest"
				},
				onHover: function (e, activeElements) {
					if (window.innerWidth <= data.breakpoint) {
						updateTooltipShow(e.chart, false);
					}
					else {
						updateTooltipShow(e.chart, true);
					}
				}
			}
		};

		this.chart = new window.Chart(this.canvas, chartData);

		if (data.breakpoint) {
			this.responsiveStyle.media = `screen and (width <= ${data.breakpoint}px)`;
		}
		else {
			this.responsiveStyle.media = "not all";
		}
	}

	get data () {
		return null;
	}
}

// this is a really bad way to do this, but chartjs api does not expose many ways to dynamically set hover and tooltip options
function updateTooltipShow (chart, enabled) {
	chart.options.plugins.tooltip.enabled = enabled;
	chart.options.interaction.mode = enabled ? "nearest" : null;
	chart.update();
}

customElements.define("resource-chart", ResourceChart);

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
	setAppearance();
	setTitleAndHeader();
	const cookie = document.cookie;
	if (cookie === "") {
		goToPage("login.html");
	}

	let resources = requestAPI("/user/dynamic/resources");
	let meta = requestAPI("/global/config/resources");
	let userCluster = requestAPI("/user/config/cluster");

	resources = await resources;
	meta = await meta;
	userCluster = await userCluster;

	document.querySelector("#username").innerText = `Username: ${getCookie("username")}`;
	document.querySelector("#pool").innerText = `Pools: ${Object.keys(userCluster.pools).toString()}`;
	document.querySelector("#vmid").innerText = `VMID Range: ${userCluster.vmid.min} - ${userCluster.vmid.max}`;
	document.querySelector("#nodes").innerText = `Nodes: ${Object.keys(userCluster.nodes).toString()}`;

	populateResources("#resource-container", meta, resources);

	document.querySelector("#change-password").addEventListener("click", handlePasswordChangeForm);
}

function populateResources (containerID, meta, resources) {
	if (resources instanceof Object) {
		const container = document.querySelector(containerID);
		Object.keys(meta).forEach((resourceType) => {
			if (meta[resourceType].display) {
				if (meta[resourceType].type === "list") {
					resources[resourceType].total.forEach((listResource) => {
						createResourceUsageChart(container, listResource.name, listResource.avail, listResource.used, listResource.max, null);
					});
				}
				else {
					createResourceUsageChart(container, meta[resourceType].name, resources[resourceType].total.avail, resources[resourceType].total.used, resources[resourceType].total.max, meta[resourceType]);
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
		<input class="w3-input w3-border" id="new-password" name="new-password" type="password"required>
		<label for="confirm-password">Confirm Password</label>
		<input class="w3-input w3-border" id="confirm-password" name="confirm-password" type="password" required>
		</form>
	`;
	const d = dialog("Change Password", body, async (result, form) => {
		if (result === "confirm") {
			const result = await requestAPI("/access/password", "POST", { password: form.get("new-password") });
			if (result.status !== 200) {
				alert(result.error);
			}
		}
	});

	const password = d.querySelector("#new-password");
	const confirmPassword = d.querySelector("#confirm-password");

	function validatePassword () {
		confirmPassword.setCustomValidity(password.value !== confirmPassword.value ? "Passwords Don't Match" : "");
	}

	password.addEventListener("change", validatePassword);
	confirmPassword.addEventListener("keyup", validatePassword);
}
