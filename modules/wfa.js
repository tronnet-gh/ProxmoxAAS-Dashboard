class WavefrontComponent {
	constructor () {
		this.lo = [0]; // lo for each wavefront
		this.hi = [0]; // hi for each wavefront
		this.W = []; // wavefront diag distance for each wavefront
		this.A = []; // compact CIGAR for backtrace
	}

	// get value for wavefront=score, diag=k
	get_val (score, k) {
		if (this.W[score] !== undefined && this.W[score][k] !== undefined) {
			return this.W[score][k];
		}
		else {
			return NaN;
		}
	}

	// set value for wavefront=score, diag=k
	set_val (score, k, val) {
		if (this.W[score]) {
			this.W[score][k] = val;
		}
		else {
			this.W[score] = [];
			this.W[score][k] = val;
		}
	}

	// get alignment traceback
	get_traceback (score, k) {
		if (this.A[score] !== undefined && this.A[score][k] !== undefined) {
			return this.A[score][k];
		}
		else {
			return undefined;
		}
	}

	// set alignment traceback
	set_traceback (score, k, traceback) {
		if (this.A[score]) {
			this.A[score][k] = traceback;
		}
		else {
			this.A[score] = [];
			this.A[score][k] = traceback;
		}
	}

	// get hi for wavefront=score
	get_hi (score) {
		const hi = this.hi[score];
		return isNaN(hi) ? 0 : hi;
	}

	// set hi for wavefront=score
	set_hi (score, hi) {
		this.hi[score] = hi;
	}

	// get lo for wavefront=score
	get_lo (score) {
		const lo = this.lo[score];
		return isNaN(lo) ? 0 : lo;
	}

	// set lo for wavefront=score
	set_lo (score, lo) {
		this.lo[score] = lo;
	}

	// string representation of all wavefronts
	toString () {
		const traceback_str = ["OI", "EI", "OD", "ED", "SB", "IN", "DL", "EN"];
		let s = "<";
		let min_lo = Infinity;
		let max_hi = -Infinity;
		// get the min lo and max hi values across all wavefronts
		for (let i = 0; i < this.W.length; i++) {
			const lo = this.lo[i];
			const hi = this.hi[i];
			if (lo < min_lo) {
				min_lo = lo;
			}
			if (hi > max_hi) {
				max_hi = hi;
			}
		}
		// print out two headers, one for wavefront and one for traceback
		for (let k = min_lo; k <= max_hi; k++) {
			s += FormatNumberLength(k, 2);
			if (k < max_hi) {
				s += "|";
			}
		}
		s += ">\t<";
		for (let k = min_lo; k <= max_hi; k++) {
			s += FormatNumberLength(k, 2);
			if (k < max_hi) {
				s += "|";
			}
		}
		s += ">\n";
		// for each wavefront
		for (let i = 0; i < this.W.length; i++) {
			s += "[";
			const lo = this.lo[i];
			const hi = this.hi[i];
			// print out the wavefront matrix
			for (let k = min_lo; k <= max_hi; k++) {
				if (this.W[i] !== undefined && this.W[i][k] !== undefined && !isNaN(this.W[i][k])) {
					s += FormatNumberLength(this.W[i][k], 2);
				}
				else if (k < lo || k > hi) {
					s += "--";
				}
				else {
					s += "  ";
				}
				if (k < max_hi) {
					s += "|";
				}
			}
			s += "]\t[";
			// print out the traceback matrix
			for (let k = min_lo; k <= max_hi; k++) {
				if (this.A[i] !== undefined && this.A[i][k] !== undefined) {
					s += traceback_str[this.A[i][k].toString()];
				}
				else if (k < lo || k > hi) {
					s += "--";
				}
				else {
					s += "  ";
				}
				if (k < max_hi) {
					s += "|";
				}
			}
			s += "]\n";
		}
		return s;
	}
}

const traceback = {
	OpenIns: 0,
	ExtdIns: 1,
	OpenDel: 2,
	ExtdDel: 3,
	Sub: 4,
	Ins: 5,
	Del: 6,
	End: 7
};

function FormatNumberLength (num, length) {
	let r = "" + num;
	while (r.length < length) {
		r = " " + r;
	}
	return r;
}

function min (args) {
	args.forEach((el, idx, arr) => {
		arr[idx] = isNaN(el) ? Infinity : el;
	});
	const min = Math.min.apply(Math, args);
	return min === Infinity ? NaN : min;
}

function max (args) {
	args.forEach((el, idx, arr) => {
		arr[idx] = isNaN(el) ? -Infinity : el;
	});
	const max = Math.max.apply(Math, args);
	return max === -Infinity ? NaN : max;
}

function argmax (args) {
	const val = max(args);
	return args.indexOf(val);
}

export default function wf_align (s1, s2, penalties) {
	const n = s1.length;
	const m = s2.length;
	const A_k = m - n;
	const A_offset = m;
	let score = 0;
	const M = new WavefrontComponent();
	M.set_val(0, 0, 0);
	M.set_hi(0, 0);
	M.set_lo(0, 0);
	M.set_traceback(0, 0, traceback.End);
	const I = new WavefrontComponent();
	const D = new WavefrontComponent();
	while (true) {
		wf_extend(M, s1, n, s2, m, score);
		if (M.get_val(score, A_k) >= A_offset) {
			break;
		}
		score++;
		wf_next(M, I, D, score, penalties);
	}
	return wf_backtrace(M, I, D, score, penalties, A_k, A_offset);
}

function wf_extend (M, s1, n, s2, m, score) {
	const lo = M.get_lo(score);
	const hi = M.get_hi(score);
	for (let k = lo; k <= hi; k++) {
		let v = M.get_val(score, k) - k;
		let h = M.get_val(score, k);
		if (isNaN(v) || isNaN(h)) {
			continue;
		}
		while (s1[v] === s2[h]) {
			M.set_val(score, k, M.get_val(score, k) + 1);
			v++;
			h++;
			if (v > n || h > m) {
				break;
			}
		}
	}
}

function wf_next (M, I, D, score, penalties) {
	const x = penalties.x;
	const o = penalties.o;
	const e = penalties.e;
	const lo = min([M.get_lo(score - x), M.get_lo(score - o - e), I.get_lo(score - e), D.get_lo(score - e)]) - 1;
	const hi = max([M.get_hi(score - x), M.get_hi(score - o - e), I.get_hi(score - e), D.get_hi(score - e)]) + 1;
	M.set_hi(score, hi);
	I.set_hi(score, hi);
	D.set_hi(score, hi);
	M.set_lo(score, lo);
	I.set_lo(score, lo);
	D.set_lo(score, lo);
	for (let k = lo; k <= hi; k++) {
		I.set_val(score, k, max([
			M.get_val(score - o - e, k - 1),
			I.get_val(score - e, k - 1)
		]) + 1);
		I.set_traceback(score, k, [traceback.OpenIns, traceback.ExtdIns][argmax([
			M.get_val(score - o - e, k - 1),
			I.get_val(score - e, k - 1)
		])]);
		D.set_val(score, k, max([
			M.get_val(score - o - e, k + 1),
			D.get_val(score - e, k + 1)
		]));
		D.set_traceback(score, k, [traceback.OpenDel, traceback.ExtdDel][argmax([
			M.get_val(score - o - e, k + 1),
			D.get_val(score - e, k + 1)
		])]);
		M.set_val(score, k, max([
			M.get_val(score - x, k) + 1,
			I.get_val(score, k),
			D.get_val(score, k)
		]));
		M.set_traceback(score, k, [traceback.Sub, traceback.Ins, traceback.Del][argmax([
			M.get_val(score - x, k) + 1,
			I.get_val(score, k),
			D.get_val(score, k)
		])]);
	}
}

function wf_backtrace (M, I, D, score, penalties, A_k) {
	const traceback_CIGAR = ["I", "I", "D", "D", "X", "", "", ""];
	const x = penalties.x;
	const o = penalties.o;
	const e = penalties.e;
	let CIGAR_rev = ""; // reversed CIGAR
	let tb_s = score; // traceback score
	let tb_k = A_k; // traceback diag k
	let current_traceback = M.get_traceback(tb_s, tb_k);
	let done = false;
	while (!done) {
		CIGAR_rev += traceback_CIGAR[current_traceback];
		switch (current_traceback) {
		case traceback.OpenIns:
			tb_s = tb_s - o - e;
			tb_k = tb_k - 1;
			current_traceback = M.get_traceback(tb_s, tb_k);
			break;
		case traceback.ExtdIns:
			tb_s = tb_s - e;
			tb_k = tb_k - 1;
			current_traceback = I.get_traceback(tb_s, tb_k);
			break;
		case traceback.OpenDel:
			tb_s = tb_s - o - e;
			tb_k = tb_k + 1;
			current_traceback = M.get_traceback(tb_s, tb_k);
			break;
		case traceback.ExtdDel:
			tb_s = tb_s - e;
			tb_k = tb_k + 1;
			current_traceback = D.get_traceback(tb_s, tb_k);
			break;
		case traceback.Sub:
			tb_s = tb_s - x;
			// tb_k = tb_k;
			current_traceback = M.get_traceback(tb_s, tb_k);
			break;
		case traceback.Ins:
			// tb_s = tb_s;
			// tb_k = tb_k;
			current_traceback = I.get_traceback(tb_s, tb_k);
			break;
		case traceback.Del:
			// tb_s = tb_s;
			// tb_k = tb_k;
			current_traceback = D.get_traceback(tb_s, tb_k);
			break;
		case traceback.End:
			done = true;
			break;
		}
	}
	const CIGAR = Array.from(CIGAR_rev).reverse().join("");
	return { CIGAR, score };
}
