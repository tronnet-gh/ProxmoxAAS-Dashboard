import "./wasm_exec.js"

// wasm setup code
export default function init(path) {
	return new Promise((res, rej) => {
		const go = new Go();
		const run = (obj) => {
			go.run(obj.instance); // main blocks on select {}, exports are callable from here on
			res(new WFA(obj.instance.exports));
		};
		if ("instantiateStreaming" in WebAssembly) {
			WebAssembly.instantiateStreaming(fetch(path), go.importObject)
				.then(run)
				.catch(rej);
		} else {
			fetch(path)
				.then((resp) => resp.arrayBuffer())
				.then((bytes) => WebAssembly.instantiate(bytes, go.importObject))
				.then(run)
				.catch(rej);
		}
	});
}

// JS wrapper for WFA wasm exports
class WFA {
	#exports;
	#encoder = new TextEncoder();
	#decoder = new TextDecoder();

	constructor(exports) {
		this.#exports = exports;
	}

	wfAlign(s1, s2, penalties, doCIGAR) {
		if (arguments.length !== 4) {
			return this.#error("invalid number of args, requires 4: s1, s2, penalties, doCIGAR");
		}
		if (typeof s1 !== "string") {
			return this.#error("s1 should be a string");
		}
		if (typeof s2 !== "string") {
			return this.#error("s2 should be a string");
		}
		if (typeof penalties !== "object" || penalties === null || ["m", "x", "o", "e"].some((k) => penalties[k] === undefined)) {
			return this.#error("penalties should be a map with key values m, x, o, e");
		}
		if (typeof doCIGAR !== "boolean") {
			return this.#error("doCIGAR should be a boolean");
		}
		const [p1, l1] = this.#put(s1);
		const [p2, l2] = this.#put(s2);
		try {
			const { m, x, o, e } = penalties;
			const score = this.#exports.wfAlign(p1, l1, p2, l2, m, x, o, e, doCIGAR);
			return { ok: true, score, CIGAR: this.#take(), error: "" };
		} finally {
			this.#exports.free(p1);
			this.#exports.free(p2);
		}
	}

	DecodeCIGAR(CIGAR) {
		if (arguments.length !== 1) {
			console.error("invalid number of args, requires 1: CIGAR");
			return null;
		}
		if (typeof CIGAR !== "string") {
			console.error("CIGAR should be a string");
			return null;
		}
		const [p, l] = this.#put(CIGAR);
		try {
			this.#exports.DecodeCIGAR(p, l);
			return this.#take();
		} finally {
			this.#exports.free(p);
		}
	}

	// copy a string into wasm memory, returns [ptr, len], caller must free ptr
	#put(s) {
		const bytes = this.#encoder.encode(s);
		const ptr = this.#exports.alloc(bytes.length);
		new Uint8Array(this.#exports.mem.buffer, ptr, bytes.length).set(bytes);
		return [ptr, bytes.length];
	}

	// copy the last string result out of wasm memory
	#take() {
		const { mem, outPtr, outLen } = this.#exports;
		return this.#decoder.decode(new Uint8Array(mem.buffer, outPtr(), outLen()));
	}

	#error(error) {
		return { ok: false, error };
	}
}
