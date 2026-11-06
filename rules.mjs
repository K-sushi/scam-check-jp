// 詐欺の勧誘文を判定する固定の規則。AI は使わない。入力は端末の外に出ない。
// 各規則の根拠は SOURCES の出典 (警察庁・都道府県警察の公開ページ)。

export const SOURCES = {
  npa: {
    name: "警察庁 SOS47「SNS型投資詐欺」",
    url: "https://www.npa.go.jp/bureau/safetylife/sos47/case/sns-romance/investment/",
  },
  ibaraki: {
    name: "茨城県警察「SNS型投資・ロマンス詐欺」",
    url: "https://www.pref.ibaraki.jp/kenkei/a01_safety/security/sns_romance.html",
  },
};

// level: "critical" = 1つでも当たれば「詐欺の可能性が高い」
//        "warn"     = 単独では断定しないが、重なると危険
export const RULES = [
  {
    id: "withdraw-fee",
    level: "critical",
    label: "利益を引き出すのに、お金を払えと言われている",
    why: "引き出しの前に「手数料」「税金」「保証金」を求めるのは、被害の最終段階の典型です。払っても戻りません。",
    // 「出金」と「手数料」が並ぶだけでは当てない (正規の業者のお知らせにも出る)。
    // 同じ文の中に「払え・入金しろ」という要求があるときだけ当てる。
    // v2: 語尾 (です / だ / となります) を条件から外した。「出金には手数料が必要だ」を初版は見逃した。
    pattern: /(出金|引き?出|払い?戻|換金|解約|凍結解除|ロック解除|返金)[^。\n]{0,30}(手数料|税金|税|保証金|解除金|費用|供託金)[^。\n]{0,30}(入金|振り?込|支払|払う|払え|払って|払わ|送金|納め|必要|かか|請求)|(手数料|税金|保証金|解除金)として[^。\n]{0,20}(払|振り?込|入金|送金)/,
    source: "npa",
  },
  {
    id: "regulator-freeze",
    level: "critical",
    label: "「当局に資金が止められている」と言われている",
    why: "監督当局や金融庁を名乗って資金の差し止めを理由に支払いを求めるのは、警察庁が挙げる手口です。",
    pattern: /(監督当局|当局|金融庁|金融局|税務署|国税).{0,20}(差し止|凍結|調査|審査|止め)/,
    source: "npa",
  },
  {
    id: "guaranteed-profit",
    level: "warn",
    label: "「必ず」「確実に」「絶対」もうかると言っている",
    why: "元本や利益を保証する投資はありません。断定的な儲け話は詐欺の入口です。",
    // v2: 「損はしない」「必ず値上がる」「簡単にもうかる」「誰でもできる」を単独でも当てる (初版は見逃した)
    pattern: /(必ず|確実に?|絶対(に)?|100\s*%|間違いなく|リスク(は)?(ゼロ|なし|ありません)).{0,15}(儲|もう|利益|稼|増え|倍|勝|値上が|上が)|損(は|を)?(しない|させない|することはない)|(簡単|楽)に(もうか|儲か|稼)|誰でも(簡単に)?(できる|稼げ|儲か|もうか)|返金保証/,
    source: "npa",
  },
  {
    id: "doubling",
    level: "warn",
    label: "お金を何倍にも増やせると言っている",
    why: "「倍増」「月利◯％」のような高すぎる利回りは、偽の利益画面で信じ込ませる手口とつながっています。",
    pattern: /(倍増|倍に(なる|できる|します)|[2-9２-９十百]+\s*倍|月利\s*[0-9０-９]+|日利\s*[0-9０-９]+)/,
    source: "npa",
  },
  {
    id: "only-you",
    level: "warn",
    label: "「あなただけ」「今がチャンス」と急がせている",
    why: "特別扱いと時間の制限で、考える時間と相談する時間を奪うのが狙いです。",
    pattern: /(あなただけ|あなたにだけ|特別に(ご)?招待|限定\s*[0-9０-９]+\s*名|今が(投資の)?チャンス|今だけ|本日(中|限り)|急いで)/,
    source: "npa",
  },
  {
    id: "celebrity-seminar",
    level: "warn",
    label: "著名人・「先生」の無料の投資講座やアシスタントが出てくる",
    why: "著名人の名前や写真を使った偽の広告から誘導し、「先生」や「アシスタント」が指示を出すのが典型です。",
    pattern: /(無料|特別).{0,10}(投資)?(セミナー|勉強会|講座|教室)|先生(の)?(指示|指導|アシスタント)|アシスタント.{0,10}(先生|講師)|(著名|有名)(人|投資家|経済評論家)/,
    source: "npa",
  },
  {
    id: "move-to-line",
    level: "warn",
    label: "LINE など別のアプリやグループに移るよう言われている",
    why: "SNS の広告や DM から LINE のグループへ移すのが、警察庁の示す流れです。グループの「成功報告」はサクラです。",
    pattern: /(LINE|ライン|ＬＩＮＥ|テレグラム|Telegram|WhatsApp).{0,20}(追加|登録|招待|グループ|移動|友達|ID|ＩＤ)|(グループ|コミュニティ|チャット).{0,10}(招待|参加して)|参加者(は|の)?(みな|みんな|全員).{0,10}(利益|儲)/,
    source: "npa",
  },
  {
    id: "personal-account",
    level: "warn",
    label: "個人名義の口座や、毎回変わる振込先を指定されている",
    why: "正規の業者は個人名義の口座に振り込ませません。振込先が毎回変わるのも典型です。",
    pattern: /(個人(名義)?(の)?口座|口座(が|を)(変更|変わ)|(こちら|以下)の口座(に|へ)|名義(は|が).{0,10}(さん|様))/,
    source: "npa",
  },
  {
    id: "crypto-push",
    level: "warn",
    label: "暗号資産や、聞いたことのない取引アプリを勧めている",
    why: "勧められた暗号資産や投資アプリを検索しても出てこない場合は詐欺を疑うよう、警察庁が呼びかけています。",
    pattern: /(暗号資産|仮想通貨|USDT|ＵＳＤＴ|ビットコイン|BTC|イーサ|コイン).{0,25}(おすすめ|購入して|買ってください|買うべき|買いましょう|送金して|入金して|に投資(して|しましょう|すべき))|(アプリ|サイト|プラットフォーム|取引所).{0,10}(ダウンロード|登録して|インストール)/,
    source: "npa",
  },
  {
    id: "deposit-required",
    level: "warn",
    label: "「保証金」「モニター会員」などの名目でお金を求めている",
    why: "「保証金が必要」「モニター会員を募集」は警察庁が挙げる誘い文句です。",
    pattern: /(保証金|会員費|入会金|モニター会員|VIP\s*(会員|プラン))/,
    source: "npa",
  },
  {
    id: "money-request",
    level: "warn",
    label: "名目をつけて、お金を払う・送る・貸すよう求めている",
    why: "「保釈金」「関税」「旅費」「配送料」「調査費用」など、もっともらしい理由でお金を求めるのは、ロマンス詐欺やなりすまし詐欺の典型です。",
    // v2 で追加。初版の評価で見逃した文の最大の型。
    pattern: /(保釈金|関税|旅費|渡航費|航空券|配送料|送料|輸送費|通関|治療費|手術|医療費|入院費|調査費用|弁護士費用|罰金|示談金|手数料|税金|保証金|費用|お金|現金|代金)[^。\n]{0,15}(送って|払って|払え|支払って|支払え|振り?込んで|貸して|立て替えて|がいる|が要る|が必要|かかる|かかります|を請求)/,
    source: "npa",
  },
  {
    id: "romance-money",
    level: "warn",
    label: "会ったことのない相手が、お金や投資の話をしている",
    why: "会わないままやり取りを続け、「二人の将来のため」などと投資やお金に誘導するのがロマンス詐欺です。",
    pattern: /(二人|ふたり|2人|僕たち|私たち)の(将来|未来|結婚).{0,20}(資金|お金|投資|貯|稼)|(会いに行く|会うため).{0,20}(費用|お金|航空券|送金)/,
    source: "ibaraki",
  },
];

// 全角英数を半角に、互換文字を正規化してから照合する
export function normalize(text) {
  return String(text ?? "").normalize("NFKC");
}

export function check(text) {
  const t = normalize(text);
  const hits = RULES.filter((r) => r.pattern.test(t));
  const critical = hits.filter((r) => r.level === "critical").length;
  let verdict;
  if (critical > 0 || hits.length >= 3) verdict = "high";
  else if (hits.length > 0) verdict = "caution";
  // 当たらなかった = 安全、ではない。新しい手口は規則に無い。
  else verdict = "no-match";
  return { verdict, hits };
}

export const VERDICT_TEXT = {
  high: "詐欺の可能性が高い特徴があります。お金を払う・送る前に、#9110 に相談してください。",
  caution: "詐欺によく出る特徴があります。相手の言う通りに進める前に、家族か #9110 に相談してください。",
  "no-match": "この道具の規則には当たりませんでした。これは「安全」という意味ではありません。新しい手口は規則にありません。少しでも不安なら #9110 に相談してください。",
};

// ---- v2: 状況の質問 (docs/DESIGN-v2.md) ----
export const QUESTIONS = [
  { id: "q1", text: "相手と、実際に会ったことがありますか?" },
  { id: "q2", text: "相手から、お金を払う・送る・貸す・投資するように言われましたか?" },
  { id: "q3", text: "相手と知り合ったのは、SNS・ネット広告・マッチングアプリ・突然の連絡ですか?" },
  { id: "q4", text: "「利益や荷物を受け取るには、先に手数料・税金・保証金が要る」と言われましたか?" },
];

export const SITUATION_SOURCES = {
  hyogo: { name: "兵庫県「まだ会ったことのない異性から金銭の話が出たら詐欺を疑う」", url: "https://web.pref.hyogo.lg.jp/kk14/documents/katudoutuushin.pdf" },
  npa: SOURCES.npa,
};

const RANK = { "no-match": 0, caution: 1, high: 2 };

// 「わからない」は「はい」と同じに扱う (見逃しより、念のための相談の方が害が小さい)
export function judgeSituation(answers = {}) {
  const yes = (q) => answers[q] === "yes" || answers[q] === "unknown" || answers[q] === undefined;
  const no = (q) => !yes(q);
  const reasons = [];
  if (yes("q4")) reasons.push({ level: "high", label: "受け取る前に、手数料・税金・保証金を求められている", source: "npa" });
  // q1 だけは「はい」が安全側 (会ったことがある)。「わからない」は会ったことが無い側に倒す。
  const neverMet = answers.q1 !== "yes";
  if (neverMet && yes("q2")) reasons.push({ level: "high", label: "会ったことのない相手が、お金の話をしている", source: "hyogo" });
  if (yes("q3") && yes("q2")) reasons.push({ level: "high", label: "SNS・広告・突然の連絡で知り合った相手が、お金の話をしている", source: "npa" });
  if (yes("q2") && !reasons.some((r) => r.level === "high")) reasons.push({ level: "caution", label: "お金を払う・送るよう言われている", source: "npa" });
  if (neverMet && yes("q3") && no("q2")) reasons.push({ level: "caution", label: "会ったことのない、ネットで知り合った相手です。お金の話が出たら、すぐ相談してください", source: "hyogo" });
  let verdict = "no-match";
  for (const r of reasons) if (RANK[r.level] > RANK[verdict]) verdict = r.level;
  return { verdict, reasons };
}

// 状況の判定と文の判定のうち、重い方を返す
export function assess({ answers = {}, text = "" } = {}) {
  const situation = judgeSituation(answers);
  const message = String(text).trim() ? check(text) : { verdict: "no-match", hits: [] };
  const verdict = RANK[situation.verdict] >= RANK[message.verdict] ? situation.verdict : message.verdict;
  return { verdict, situation, message };
}

// 利用者が自分の AI (ChatGPT・Claude などの無料版) に貼るための文面
export function buildAiPrompt(text, result) {
  const found = result.hits.map((h) => `- ${h.label}`).join("\n") || "- (規則には当たらなかった)";
  return [
    "あなたは日本の詐欺対策の相談員です。次のメッセージが詐欺かどうか、断定はせずに一緒に考えてください。",
    "答える時の決まり: 「安全です」とは言わない。お金を払う前に警察相談専用電話 #9110 に相談するよう勧める。相手に返信する文面は作らない。",
    "",
    "固定の規則で見つかった特徴:",
    found,
    "",
    "質問: このメッセージの中で、特に危ない点はどこですか? 相手が本物の業者かを確かめるには、何を調べればよいですか? (金融庁の登録業者かどうかの確認方法も含めて)",
    "",
    "--- メッセージ (名前・電話番号・口座番号は消してから貼ってください) ---",
    text,
  ].join("\n");
}
