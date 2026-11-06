// 凍結した採点コード。eval/PREREG.md の定義どおりに計算し、PASS / FAIL / 件数不足 を出す。
// 使い方: node eval/score.mjs eval/corpus.jsonl  →  eval/results.json を書く
import { readFileSync, writeFileSync } from "node:fs";
import { check } from "../rules.mjs";

const MIN_N = 30;
const RECALL_LINE = 0.60;
const HIGH_FPR_LINE = 0.05;

function wilson(k, n, z = 1.96) {
  if (n === 0) return [null, null];
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [+(c - h).toFixed(3), +(c + h).toFixed(3)];
}
const rate = (k, n) => ({ k, n, rate: n ? +(k / n).toFixed(3) : null, ci95: wilson(k, n) });

const path = process.argv[2] ?? "eval/corpus.jsonl";
const rows = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));

// 同じ文の重複は 1 件に数える
const seen = new Set();
const uniq = rows.filter((r) => { const k = `${r.label}\u0000${r.text.normalize("NFKC").trim()}`; if (seen.has(k)) return false; seen.add(k); return true; });

const scored = uniq.map((r) => { const c = check(r.text); return { ...r, verdict: c.verdict, hits: c.hits.map((h) => h.id) }; });
const scam = scored.filter((r) => r.label === "scam");
const benign = scored.filter((r) => r.label === "benign");

const recall = rate(scam.filter((r) => r.verdict !== "no-match").length, scam.length);
const recallHigh = rate(scam.filter((r) => r.verdict === "high").length, scam.length);
const fprHigh = rate(benign.filter((r) => r.verdict === "high").length, benign.length);
const fprAny = rate(benign.filter((r) => r.verdict !== "no-match").length, benign.length);

const byCategory = {};
for (const r of scam) {
  const c = r.category ?? "その他";
  byCategory[c] ??= { k: 0, n: 0 };
  byCategory[c].n++; if (r.verdict !== "no-match") byCategory[c].k++;
}

let decision;
if (scam.length < MIN_N || benign.length < MIN_N) decision = "件数不足";
else decision = recall.rate >= RECALL_LINE && fprHigh.rate <= HIGH_FPR_LINE ? "PASS" : "FAIL";

const out = {
  decision,
  lines: { recall: RECALL_LINE, high_fpr: HIGH_FPR_LINE, min_n: MIN_N },
  primary: { recall, high_fpr: fprHigh },
  reference: { recall_high: recallHigh, fpr_any: fprAny, recall_by_category: byCategory },
  dropped_duplicates: rows.length - uniq.length,
  missed: scam.filter((r) => r.verdict === "no-match").map((r) => ({ id: r.id, text: r.text })),
  false_high: benign.filter((r) => r.verdict === "high").map((r) => ({ id: r.id, text: r.text, hits: r.hits })),
  false_any: benign.filter((r) => r.verdict !== "no-match").map((r) => ({ id: r.id, text: r.text, hits: r.hits })),
};
writeFileSync("eval/results.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ decision, recall, high_fpr: fprHigh, recall_high: recallHigh, fpr_any: fprAny, byCategory }, null, 2));
