import { test } from "node:test";
import assert from "node:assert/strict";
import { check, RULES, buildAiPrompt } from "../rules.mjs";

// 詐欺の文: 警察庁 SOS47 と茨城県警察のページにある誘い文句・流れを元に組み立てた例
const SCAMS = [
  ["出金するには、まず税金として利益の20%を入金してください", "withdraw-fee", "high"],
  ["監督当局によって資金が差し止めされています。解除金が必要です", "regulator-freeze", "high"],
  ["この方法なら必ずもうかります。今が投資のチャンスです", "guaranteed-profit", "caution"],
  ["お金を倍増させるプランがあります", "doubling", "caution"],
  ["先生の指示ならもっと儲けることができます。無料の投資セミナーにご招待します", "celebrity-seminar", "caution"],
  ["詳しくはLINEのグループに招待しますので、IDを追加してください", "move-to-line", "caution"],
  ["チャットの参加者はみな利益を得ています", "move-to-line", "caution"],
  ["今、投資するなら暗号資産がおすすめです", "crypto-push", "caution"],
  ["保証金が必要です。モニター会員を募集しています", "deposit-required", "caution"],
  ["二人の将来のため資金をためよう", "romance-money", "caution"],
  ["今回はこちらの口座に振り込んでください。名義は田中さんです", "personal-account", "caution"],
  ["ＬＩＮＥでグループに招待します。あなただけ特別です。絶対に儲かる", "move-to-line", "high"],
];

// 詐欺でない文: 規則に当たってはいけない (誤検出の確認)
const BENIGN = [
  "明日の会議は10時からです。資料は共有フォルダにあります",
  "日経平均は前日比で小幅に上昇して取引を終えました",
  "新NISAのつみたて投資枠について、銀行の窓口で説明を聞いてきた",
  "週末に家族でキャンプに行きます。天気が心配です",
  "LINEありがとう、また連絡するね",
  "投資は自己責任で、元本割れのリスクがあります",
  "電気代の口座振替の手続きが終わりました",
];

for (const [text, ruleId, verdict] of SCAMS) {
  test(`詐欺の文を検出する: ${text.slice(0, 20)}…`, () => {
    const r = check(text);
    assert.ok(r.hits.some((h) => h.id === ruleId), `${ruleId} に当たっていない (当たった規則: ${r.hits.map((h) => h.id).join(",") || "なし"})`);
    assert.equal(r.verdict, verdict);
  });
}

for (const text of BENIGN) {
  test(`詐欺でない文で誤検出しない: ${text.slice(0, 20)}…`, () => {
    const r = check(text);
    assert.deepEqual(r.hits.map((h) => h.id), []);
    assert.equal(r.verdict, "no-match");
  });
}

test("当たらなかった時に「安全」と言わない", async () => {
  const { VERDICT_TEXT } = await import("../rules.mjs");
  assert.match(VERDICT_TEXT["no-match"], /「安全」という意味ではありません/);
});

test("全ての規則に出典と理由がある", () => {
  for (const r of RULES) {
    assert.ok(r.source && r.why && r.label, r.id);
  }
});

test("AI 用の文面に #9110 と個人情報を消す注意が入る", () => {
  const t = "必ずもうかります";
  const p = buildAiPrompt(t, check(t));
  assert.match(p, /#9110/);
  assert.match(p, /消してから貼って/);
  assert.match(p, /「安全です」とは言わない/);
});
