// v2 の凍結した採点コード。eval-v2/PREREG.md の定義どおり。
// 使い方: node eval-v2/score.mjs <corpus.jsonl> <rules の commit id>  →  eval-v2/results.json
import { readFileSync, writeFileSync } from "node:fs";
import { assess } from "../rules.mjs";

const MIN_N = 30, RECALL_LINE = 0.80, HIGH_FPR_LINE = 0.05;
const ALL_NO = { q1: "no", q2: "no", q3: "no", q4: "no" };

function wilson(k, n, z = 1.96) {
  if (n === 0) return [null, null];
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [+(c - h).toFixed(3), +(c + h).toFixed(3)];
}
const rate = (k, n) => ({ k, n, rate: n ? +(k / n).toFixed(3) : null, ci95: wilson(k, n) });

const [path, rulesCommit] = process.argv.slice(2);
const rows = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
const answersOf = (r) => ({ q1: r.q1 ?? "unknown", q2: r.q2 ?? "unknown", q3: r.q3 ?? "unknown", q4: r.q4 ?? "unknown" });

const scored = rows.map((r) => ({ ...r, verdict: assess({ answers: answersOf(r), text: r.text ?? "" }).verdict }));
const scam = scored.filter((r) => r.label === "scam");
const benign = scored.filter((r) => r.label === "benign");
const scamWithText = scam.filter((r) => (r.text ?? "").trim());
const allUnknown = (r) => ["q1", "q2", "q3", "q4"].every((q) => answersOf(r)[q] === "unknown");

const recall = rate(scam.filter((r) => r.verdict !== "no-match").length, scam.length);
const highFpr = rate(benign.filter((r) => r.verdict === "high").length, benign.length);
const textOnly = rate(scamWithText.filter((r) => assess({ answers: ALL_NO, text: r.text }).verdict !== "no-match").length, scamWithText.length);

let decision;
if (scam.length < MIN_N || benign.length < MIN_N) decision = "件数不足";
else decision = recall.rate >= RECALL_LINE && highFpr.rate <= HIGH_FPR_LINE ? "PASS" : "FAIL";

const out = {
  decision, rules_commit: rulesCommit ?? null,
  lines: { recall: RECALL_LINE, high_fpr: HIGH_FPR_LINE, min_n: MIN_N },
  primary: { recall, high_fpr: highFpr },
  reference: {
    text_only_recall: textOnly,
    all_unknown_share_scam: rate(scam.filter(allUnknown).length, scam.length),
    all_unknown_share_benign: rate(benign.filter(allUnknown).length, benign.length),
    recall_excluding_all_unknown: rate(scam.filter((r) => !allUnknown(r) && r.verdict !== "no-match").length, scam.filter((r) => !allUnknown(r)).length),
    fpr_any: rate(benign.filter((r) => r.verdict !== "no-match").length, benign.length),
  },
  missed: scam.filter((r) => r.verdict === "no-match").map((r) => ({ id: r.id, answers: answersOf(r), text: r.text ?? "" })),
  false_high: benign.filter((r) => r.verdict === "high").map((r) => ({ id: r.id, answers: answersOf(r), text: r.text ?? "" })),
};
writeFileSync("eval-v2/results.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ decision, rules_commit: out.rules_commit, ...out.primary, ...out.reference }, null, 2));
