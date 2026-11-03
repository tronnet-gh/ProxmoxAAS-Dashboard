import { getSetting } from "./utils.js";
import wfaInit from "../modules/wfa.js";

const penalties = { m: 0, x: 2, o: 3, e: 1 };
const collator = new Intl.Collator(undefined, { numeric: true });

let wfa = null;

export async function initSearch () {
	wfa = await wfaInit("websrc/modules/wfa.wasm.gz");
	customElements.define("search-bar", SearchBar);
}

class SearchBar extends HTMLElement {
	connectedCallback () {
		const form = this.shadowRoot.querySelector("form");
		form.oninput = () => this.search();
		form.onsubmit = (event) => {
			event.preventDefault();
			this.search();
		};
		this.search();
	}

	#matchExact (text, query) {
		const start = text.indexOf(query);
		if (start === -1) {
			return { score: 0, alignment: null };
		}
		const remaining = text.length - start - query.length;
		return { score: -1, alignment: `${"X".repeat(start)}${"M".repeat(query.length)}${"X".repeat(remaining)}` };
	}

	#matchFuzzy (text, query) {
		const { score, CIGAR } = wfa.wfAlign(query, text, penalties, true);
		return { score: score / Math.max(text.length, query.length), alignment: wfa.DecodeCIGAR(CIGAR) };
	}

	#renderMatch (element, text, alignment) {
		if (!alignment) {
			element.textContent = text || "\u00a0";
			return;
		}
		element.textContent = "";
		let i = 0;
		for (const operation of alignment) {
			if (operation === "D") {
				continue;
			}
			if (i >= text.length) {
				break;
			}
			const part = document.createElement("span");
			part.textContent = text[i];
			if (operation === "M") {
				part.style = "color: var(--lightbg-text-color); background-color: var(--highlight-color);";
			}
			element.append(part);
			i++;
		}
	}

	#getData (item, key) {
		return item.getAttribute(`data-${key}`) ?? "";
	}

	search () {
		const match = getSetting("search-criteria") === "exact" ? this.#matchExact : this.#matchFuzzy;
		const query = this.shadowRoot.querySelector("input").value.toLowerCase();
		const field = this.dataset.field;
		const sortBy = this.dataset.sortby;

		const results = Array.from(document.querySelectorAll(this.dataset.items), (item) => {
			const text = this.#getData(item, field);
			const { score, alignment } = query ? match(text.toLowerCase(), query) : { score: 0, alignment: null };
			return { item, text, score, alignment };
		});

		results.sort((a, b) => {
			return a.score - b.score || (sortBy ? collator.compare(this.#getData(a.item, sortBy), this.#getData(b.item, sortBy)) : 0);
		});

		for (const { item, text, alignment } of results) {
			item.parentElement.appendChild(item);
			const target = (item.shadowRoot ?? item).querySelector(`[data-search-field="${field}"]`);
			if (target) {
				this.#renderMatch(target, text, alignment);
			}
		}
	}
}
