import { requestAPI, setAppearance, requestDash } from "./utils.js";
import { dialog, error } from "./dialog.js";
import { initSearch } from "./search.js";

window.addEventListener("DOMContentLoaded", init);

async function init () {
	setAppearance();

	document.querySelector("#pool-add").addEventListener("click", handlePoolAddButton);

	await initSearch();
}

async function refreshPools () {
	const pools = await requestDash("/admin/pools", "GET");
	if (pools.status !== 200) {
		error(`Error fetching pools: ${pools.status} ${pools.error !== undefined ? pools.error : ""}`);
	}
	else {
		const container = document.querySelector("#pool-container");
		container.setHTMLUnsafe(pools.data);
		document.querySelector("#pool-search").search();
	}
}

function handlePoolAddButton () {
	const template = document.querySelector("#create-pool-dialog");
	dialog(template, async (result, form) => {
		if (result === "confirm") {
			const poolname = form.get("poolname");
			const response = await requestAPI(`/access/pools/${encodeURIComponent(poolname)}`, "POST");
			if (response.status !== 200) {
				error(`Attempted to create new pool ${poolname} but got: ${response.status} ${response.error !== undefined ? response.error : ""}`);
			}
			refreshPools();
		}
	});
}
