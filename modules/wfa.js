class WavefrontComponent {constructor () {this.lo = [0]; this.hi = [0]; this.W = []; this.A = []; }getVal (score, k) {if (this.W[score] !== undefined && this.W[score][k] !== undefined) {return this.W[score][k];}else {return NaN;}}setVal (score, k, val) {if (this.W[score]) {this.W[score][k] = val;}else {this.W[score] = [];this.W[score][k] = val;}}getTraceback (score, k) {if (this.A[score] !== undefined && this.A[score][k] !== undefined) {return this.A[score][k];}else {return undefined;}}setTraceback (score, k, traceback) {if (this.A[score]) {this.A[score][k] = traceback;}else {this.A[score] = [];this.A[score][k] = traceback;}}getHi (score) {const hi = this.hi[score];return isNaN(hi) ? 0 : hi;}setHi (score, hi) {this.hi[score] = hi;}getLo (score) {const lo = this.lo[score];return isNaN(lo) ? 0 : lo;}setLo (score, lo) {this.lo[score] = lo;}toString () {const traceback_str = ["OI", "EI", "OD", "ED", "SB", "IN", "DL", "EN"];let s = "<";let min_lo = Infinity;let max_hi = -Infinity;for (let i = 0; i < this.W.length; i++) {const lo = this.lo[i];const hi = this.hi[i];if (lo < min_lo) {min_lo = lo;}if (hi > max_hi) {max_hi = hi;}}for (let k = min_lo; k <= max_hi; k++) {s += FormatNumberLength(k, 2);if (k < max_hi) {s += "|";}}s += ">\t<";for (let k = min_lo; k <= max_hi; k++) {s += FormatNumberLength(k, 2);if (k < max_hi) {s += "|";}}s += ">\n";for (let i = 0; i < this.W.length; i++) {s += "[";const lo = this.lo[i];const hi = this.hi[i];for (let k = min_lo; k <= max_hi; k++) {if (this.W[i] !== undefined && this.W[i][k] !== undefined && !isNaN(this.W[i][k])) {s += FormatNumberLength(this.W[i][k], 2);}else if (k < lo || k > hi) {s += "--";}else {s += "  ";}if (k < max_hi) {s += "|";}}s += "]\t[";for (let k = min_lo; k <= max_hi; k++) {if (this.A[i] !== undefined && this.A[i][k] !== undefined) {s += traceback_str[this.A[i][k].toString()];}else if (k < lo || k > hi) {s += "--";}else {s += "  ";}if (k < max_hi) {s += "|";}}s += "]\n";}return s;}}const traceback = {OpenIns: 0,ExtdIns: 1,OpenDel: 2,ExtdDel: 3,Sub: 4,Ins: 5,Del: 6,End: 7};function FormatNumberLength (num, length) {let r = "" + num;while (r.length < length) {r = " " + r;}return r;}function min (args) {args.forEach((el, idx, arr) => {arr[idx] = isNaN(el) ? Infinity : el;});const min = Math.min.apply(Math, args);return min === Infinity ? NaN : min;}function max (args) {args.forEach((el, idx, arr) => {arr[idx] = isNaN(el) ? -Infinity : el;});const max = Math.max.apply(Math, args);return max === -Infinity ? NaN : max;}function argmax (args) {const val = max(args);return args.indexOf(val);}export default function wfAlign (s1, s2, penalties, doCIGAR = false) {const n = s1.length;const m = s2.length;const A_k = m - n;const A_offset = m;let score = 0;const M = new WavefrontComponent();M.setVal(0, 0, 0);M.setHi(0, 0);M.setLo(0, 0);M.setTraceback(0, 0, traceback.End);const I = new WavefrontComponent();const D = new WavefrontComponent();while (true) {wfExtend(M, s1, n, s2, m, score);if (M.getVal(score, A_k) >= A_offset) {break;}score++;wfNext(M, I, D, score, penalties);}let CIGAR = null;if (doCIGAR) {CIGAR = wfBacktrace(M, I, D, score, penalties, A_k, A_offset);}return { score, CIGAR };}function wfExtend (M, s1, n, s2, m, score) {const lo = M.getLo(score);const hi = M.getHi(score);for (let k = lo; k <= hi; k++) {let v = M.getVal(score, k) - k;let h = M.getVal(score, k);if (isNaN(v) || isNaN(h)) {continue;}while (s1[v] === s2[h]) {M.setVal(score, k, M.getVal(score, k) + 1);v++;h++;if (v > n || h > m) {break;}}}}function wfNext (M, I, D, score, penalties, do_traceback) {const x = penalties.x;const o = penalties.o;const e = penalties.e;const lo = min([M.getLo(score - x), M.getLo(score - o - e), I.getLo(score - e), D.getLo(score - e)]) - 1;const hi = max([M.getHi(score - x), M.getHi(score - o - e), I.getHi(score - e), D.getHi(score - e)]) + 1;M.setHi(score, hi);I.setHi(score, hi);D.setHi(score, hi);M.setLo(score, lo);I.setLo(score, lo);D.setLo(score, lo);for (let k = lo; k <= hi; k++) {I.setVal(score, k, max([M.getVal(score - o - e, k - 1),I.getVal(score - e, k - 1)]) + 1);I.setTraceback(score, k, [traceback.OpenIns, traceback.ExtdIns][argmax([M.getVal(score - o - e, k - 1),I.getVal(score - e, k - 1)])]);D.setVal(score, k, max([M.getVal(score - o - e, k + 1),D.getVal(score - e, k + 1)]));D.setTraceback(score, k, [traceback.OpenDel, traceback.ExtdDel][argmax([M.getVal(score - o - e, k + 1),D.getVal(score - e, k + 1)])]);M.setVal(score, k, max([M.getVal(score - x, k) + 1,I.getVal(score, k),D.getVal(score, k)]));M.setTraceback(score, k, [traceback.Sub, traceback.Ins, traceback.Del][argmax([M.getVal(score - x, k) + 1,I.getVal(score, k),D.getVal(score, k)])]);}}function wfBacktrace (M, I, D, score, penalties, A_k) {const traceback_CIGAR = ["I", "I", "D", "D", "X", "", "", ""];const x = penalties.x;const o = penalties.o;const e = penalties.e;let CIGAR_rev = ""; let tb_s = score; let tb_k = A_k; let current_traceback = M.getTraceback(tb_s, tb_k);let done = false;while (!done) {CIGAR_rev += traceback_CIGAR[current_traceback];switch (current_traceback) {case traceback.OpenIns:tb_s = tb_s - o - e;tb_k = tb_k - 1;current_traceback = M.getTraceback(tb_s, tb_k);break;case traceback.ExtdIns:tb_s = tb_s - e;tb_k = tb_k - 1;current_traceback = I.getTraceback(tb_s, tb_k);break;case traceback.OpenDel:tb_s = tb_s - o - e;tb_k = tb_k + 1;current_traceback = M.getTraceback(tb_s, tb_k);break;case traceback.ExtdDel:tb_s = tb_s - e;tb_k = tb_k + 1;current_traceback = D.getTraceback(tb_s, tb_k);break;case traceback.Sub:tb_s = tb_s - x;current_traceback = M.getTraceback(tb_s, tb_k);break;case traceback.Ins:current_traceback = I.getTraceback(tb_s, tb_k);break;case traceback.Del:current_traceback = D.getTraceback(tb_s, tb_k);break;case traceback.End:done = true;break;}}return Array.from(CIGAR_rev).reverse().join("");}