// 〈하루 끝〉 세션 현황판 — 폴더를 읽어 현황판.html 을 매번 새로 그린다.
// 실행: node automations/session-dashboard.mjs  →  하루끝-키트/현황판.html

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const normalizeName = (s) =>
  s.toLowerCase().replace(/[\s,._\-]/g, '');

// 파일명에서 접두어(오디오대본_, 오디오 대본_, 오디오_, 세션_)를 제거한다.
const stripAudioPrefix = (f) =>
  f.replace(/^오디오대본_?/, '')
   .replace(/^오디오 대본_?/, '')
   .replace(/^오디오_?/, '')
   .replace(/^세션_?/, '');

// 파일명에서 매칭 키 추출: 접두어 제거 후 버전 번호(vN.N)까지만 normalizeName.
// 버전 이후 내용(예: _10분, _3초컷)은 제외해 이름 표기 차이를 흡수한다.
// 예) '오디오대본_하루끝-나에게_v0.1.md'  → '하루끝나에게v01'
//     '오디오대본_하루끝-나에게_v0.1.m4a' → '하루끝나에게v01'  (같은 키)
export const mediaKey = (f) => {
  const bare = stripAudioPrefix(f.replace(/\.m4a$/, '').replace(/\.md$/, ''));
  const vMatch = bare.match(/(v\d+\.\d+)/i);
  if (vMatch) {
    const idx = bare.indexOf(vMatch[1]);
    return normalizeName(bare.slice(0, idx) + vMatch[1]);
  }
  return normalizeName(bare);
};

export function classifyOutputs(files) {
  // m4a 키 집합: 접두어 제거 + 버전까지만
  const m4aKeySet = new Set(
    files.filter(f => f.endsWith('.m4a')).map(f => mediaKey(f))
  );
  const scripts = files.filter(f =>
    f.endsWith('.md') && (f.startsWith('오디오대본') || f.startsWith('세션')));
  const 초안 = [], 녹음 = [];
  for (const s of scripts) {
    const name = s.replace(/\.md$/, '');
    (m4aKeySet.has(mediaKey(s)) ? 녹음 : 초안).push(name);
  }
  return { 초안, 녹음 };
}

export const daysSince = (mtimeMs, nowMs) =>
  Math.floor((nowMs - mtimeMs) / 86400000);

// 밀리초 → 한국시간 기준 'YYYY-MM-DD' (자정 경계 비교용)
export const kstDate = (ms) =>
  new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

export const findStalled = (items, stall = 7) =>
  items.filter(i => i.days >= stall).sort((a, b) => b.days - a.days);

export function decideNextStep({ 초안, 재료 }) {
  const 세션초안 = 초안.find(n => n.startsWith('세션'));
  const pick = 세션초안 || 초안[0];
  if (pick) return `"${pick}" — 대본은 됐어요. 읽고 녹음하면 발행 후보가 됩니다.`;
  if (재료.length) return `정리된 재료 ${재료.length}개가 기다려요. 그중 하나로 질문지·대본을 만들어 보세요.`;
  return `새 상태 하나를 골라 세션을 시작해 보세요.`;
}

export function parsePublished(text) {
  const out = new Set();
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/^[\s\-*]+/, '').trim();
    if (!line || line.startsWith('#')) continue;
    out.add(normalizeName(line));
  }
  return out;
}

export function stageOf(name, 발행keys, hasM4a, isMaterial) {
  if (발행keys.has(normalizeName(name))) return { label: '발행', step: 7 };
  if (hasM4a) return { label: '녹음', step: 6 };
  if (isMaterial) return { label: '재료', step: 2 };
  return { label: '대본', step: 4 };
}

export const collectToday = (items) => items.filter(i => i.isToday).map(i => i.name);

const 다음행동 = { '재료': '대본 쓰기', '대본': '녹음', '녹음': '발행' };

export function bottleneck(counts) {
  const total = counts.재료 + counts.대본 + counts.녹음 + counts.발행;
  const rate = total > 0 ? Math.round(counts.발행 / total * 100) : 0;
  let 쌓인단계 = null;
  const pairs = [['재료', '대본'], ['대본', '녹음'], ['녹음', '발행']];
  for (const [앞, 뒤] of pairs) {
    if (counts[앞] >= counts[뒤] * 2 && counts[앞] > 0) { 쌓인단계 = 뒤; break; }
  }
  return { total, rate, 쌓인단계 };
}

export function decideAdvice({ 늦은, 쌓인단계, fallback }) {
  const lines = [];
  if (늦은) lines.push(`"${늦은.name}"이 ${늦은.days}일째 ${늦은.label}에서 멈췄어요. ${다음행동[늦은.label] || '다음 단계'} 추천.`);
  if (쌓인단계) lines.push(`한 단계에 일이 쌓였어요(병목: ${쌓인단계}).`);
  if (lines.length === 0) lines.push(fallback);
  return lines.slice(0, 2);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const badge = (i) => `${i.date} 손댐 · ${i.days === 0 ? '오늘' : i.days + '일째'}${i.stalled ? ' · 잠듦' : ''}`;

const col = (title, arr, hint) => `
  <section class="col">
    <h2>${title} <span class="count">${arr.length}</span></h2>
    <p class="hint">${hint}</p>
    ${arr.length ? arr.map(i => `<div class="item${i.stalled ? ' stalled' : ''}">
      <div class="iname">${esc(i.name)}</div><div class="ibadge">${badge(i)}</div></div>`).join('')
      : '<div class="empty">— 아직 없음 —</div>'}
  </section>`;

const bar = (step) => {
  const fill = Math.round(step / 7 * 7);   // 7칸 중 step칸
  return '▓'.repeat(fill) + '░'.repeat(7 - fill);
};
const 진도Row = (i) => `
  <div class="prow${i.stalled ? ' stalled' : ''}">
    <span class="pname">${esc(i.name)}</span>
    <span class="pbar">${bar(i.stage.step)}</span>
    <span class="plabel">${esc(i.stage.label)} (${i.stage.step}/7)${i.stalled ? ' · ' + i.days + '일째 ⏰' : ''}</span>
  </div>`;
const 병목Row = (k, n, max) => `
  <div class="brow"><span class="bk">${k}</span>
    <span class="bbar" style="--w:${max > 0 ? Math.round(n / max * 100) : 0}%"></span>
    <span class="bn">${n}</span></div>`;

const stages = ['상태', '재료', '질문지', '대본', 'AI티빼기', '결점검', '발행'];

// 세션 생산 라인 — 단계별 "누가 무엇으로" (트리 ③·④). 고정 내용.
const 라인 = [
  { 단계: '① 상태', 누가: '나', 무엇: '어떤 상태로 세션을 만들지 고른다', 도구: '—', 저장: '—' },
  { 단계: '② 재료 모으기', 누가: 'AI', 무엇: '유튜브 자막·자료를 읽어 핵심을 뽑는다', 도구: 'YouTube 자막', 저장: '자료함/정리' },
  { 단계: '③ 질문지·과제', 누가: 'AI', 무엇: '재료에서 질문·과제를 정리한다', 도구: '질문과제정리', 저장: '하루끝-키트/outputs' },
  { 단계: '④ 대본 초안', 누가: 'AI', 무엇: '녹음용 대본 초안을 쓴다', 도구: '녹음대본', 저장: '하루끝-키트/outputs' },
  { 단계: '⑤ AI티 빼기', 누가: 'AI', 무엇: '기계 말투를 걷어낸다', 도구: '결다듬기', 저장: '하루끝-키트/outputs' },
  { 단계: '⑥ 결 점검', 누가: 'AI+나', 무엇: '금지어·거울·결을 보고, 마지막은 내가 본다', 도구: '결다듬기', 저장: '—' },
  { 단계: '⑦ 녹음·발행', 누가: '나', 무엇: '내 목소리로 녹음하고 사이트에 올린다', 도구: '—', 저장: '노션 · 사이트' },
];

// 내보내기 전 점검 (트리 ⑤). 화면에서 체크 → 브라우저에 저장.
// 설명에 금지어(§5 단어)를 직접 쓰지 않는다.
const 점검 = [
  { id: 'ban', k: '금지어 0', d: '쓰면 안 되는 말이 하나도 없나 (CLAUDE.md §5)' },
  { id: 'mirror', k: '거울', d: '판정·조언이 아니라 비춰주기인가' },
  { id: 'noai', k: 'AI티 없음', d: '기계 말투·번역투가 없나' },
  { id: 'mine', k: '최종 문장은 내가', d: '마지막 문장은 내 손을 거쳤나' },
];

const STYLE = `
  :root{ --bg:#f7f5f0; --ink:#2b2925; --muted:#8a8479; --line:#e3ded4; --accent:#6b7d6a; --accentbg:#eef1ea;
    --warn:#c2742e; --warnbg:#fbf1e4; --warnline:#e9cfa8; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; line-height:1.6; }
  .wrap{ max-width:980px; margin:0 auto; padding:40px 24px 64px; }
  h1{ font-size:24px; font-weight:600; margin:0 0 4px; }
  .sub{ color:var(--muted); font-size:14px; margin:0 0 24px; }
  .pipeline{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:12px 16px; background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:20px; }
  .stage{ font-size:13px; padding:4px 10px; background:var(--bg); border-radius:8px; } .arrow{ color:var(--muted); font-size:12px; }
  .callout{ border-radius:16px; padding:16px 20px; margin-bottom:14px; }
  .next{ background:var(--accentbg); border:1px solid #d4ddd0; } .sleep{ background:var(--warnbg); border:1px solid var(--warnline); }
  .lbl{ font-size:12px; font-weight:600; margin-bottom:6px; } .next .lbl{ color:var(--accent); } .sleep .lbl{ color:var(--warn); }
  .callout .body{ font-size:16px; }
  .board{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:8px; }
  .col{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 16px 20px; }
  .col h2{ font-size:15px; font-weight:600; margin:0 0 2px; }
  .count{ font-size:12px; color:#fff; background:var(--accent); border-radius:20px; padding:1px 9px; }
  .hint{ font-size:12px; color:var(--muted); margin:0 0 12px; }
  .item{ padding:9px 11px; border:1px solid var(--line); border-radius:10px; margin-bottom:8px; background:#fcfbf8; }
  .item.stalled{ border-color:var(--warnline); background:var(--warnbg); }
  .iname{ font-size:13.5px; } .ibadge{ font-size:11.5px; color:var(--muted); margin-top:3px; } .item.stalled .ibadge{ color:var(--warn); }
  .empty{ font-size:13px; color:var(--muted); padding:8px 0; }
  .tally{ display:flex; gap:12px; margin-top:22px; }
  .tally .t{ flex:1; background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; text-align:center; }
  .tally .n{ font-size:28px; font-weight:600; color:var(--accent); } .tally .k{ font-size:12px; color:var(--muted); margin-top:2px; }
  .foot{ margin-top:26px; font-size:12px; color:var(--muted); text-align:center; }
  .sec-title{ font-size:17px; font-weight:600; margin:36px 0 4px; }
  .sec-sub{ font-size:13px; color:var(--muted); margin:0 0 14px; }
  .lanes{ background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  .lane{ display:grid; grid-template-columns:108px 78px 1fr 130px 150px; gap:10px; align-items:center; padding:12px 16px; border-top:1px solid var(--line); font-size:13px; }
  .lane:first-child{ border-top:none; }
  .lane-step{ font-weight:600; }
  .lane-who{ font-size:12px; padding:2px 8px; border-radius:20px; text-align:center; white-space:nowrap; }
  .lane-who.me{ background:#fbf1e4; color:var(--warn); } .lane-who.ai{ background:var(--accentbg); color:var(--accent); }
  .lane-who.both{ background:#eee9df; color:#6a6258; }
  .lane-what{ color:var(--ink); }
  .chip{ font-size:12px; background:var(--bg); border:1px solid var(--line); border-radius:7px; padding:2px 8px; }
  .lane-save{ font-size:12px; color:var(--muted); }
  .dash{ color:#c9c2b4; }
  .lane-head{ font-size:11px; color:var(--muted); font-weight:600; background:var(--bg); }
  .checks{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .check{ display:grid; grid-template-columns:22px 1fr; grid-template-rows:auto auto; column-gap:10px; align-items:center;
    background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; cursor:pointer; }
  .check input{ grid-row:1/3; width:20px; height:20px; accent-color:var(--accent); cursor:pointer; }
  .check-k{ font-size:14px; font-weight:600; } .check-d{ font-size:12px; color:var(--muted); }
  .check input:checked ~ .check-k{ color:var(--accent); }
  .check:has(input:checked){ background:var(--accentbg); border-color:#d4ddd0; }
  .check-reset{ margin-top:10px; font-size:12px; color:var(--muted); background:none; border:none; cursor:pointer; text-decoration:underline; }
  @media(max-width:760px){ .board{grid-template-columns:1fr;} .tally{flex-direction:column;} .checks{grid-template-columns:1fr;}
    .lane{ grid-template-columns:1fr 1fr; row-gap:4px; } .lane-what{ grid-column:1/3; } .lane-head{ display:none; } }
  .today{ background:#eef1ea; border:1px solid #d4ddd0; }
  .today-row{ display:flex; gap:12px; font-size:15px; margin-top:4px; }
  .today-k{ min-width:96px; color:var(--accent); font-weight:600; }
  .adv{ background:#fbf7ee; border:1px solid #ecdcc0; } .adv .lbl{ color:var(--warn); }
  .adv-line{ font-size:15px; margin-top:2px; }
  .prows{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:8px 16px; }
  .prow{ display:grid; grid-template-columns:140px auto 1fr; gap:12px; align-items:center; padding:8px 0; border-top:1px solid var(--line); font-size:13px; }
  .prow:first-child{ border-top:none; } .prow.stalled .plabel{ color:var(--warn); }
  .pname{ font-weight:600; } .pbar{ font-family:monospace; letter-spacing:2px; color:var(--accent); } .plabel{ color:var(--muted); }
  .brows{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:12px 16px; }
  .brow{ display:grid; grid-template-columns:48px 1fr 32px; gap:10px; align-items:center; margin:6px 0; font-size:13px; }
  .bk{ color:var(--muted); } .bn{ text-align:right; font-weight:600; }
  .bbar{ height:14px; border-radius:7px; background:var(--accentbg); position:relative; }
  .bbar::after{ content:''; position:absolute; left:0; top:0; bottom:0; width:var(--w); background:var(--accent); border-radius:7px; }
  .brate{ font-size:12px; color:var(--muted); text-align:right; margin-top:6px; }
  details.fold{ background:#fff; border:1px solid var(--line); border-radius:14px; margin-top:14px; padding:4px 16px; }
  details.fold summary{ cursor:pointer; font-size:15px; font-weight:600; padding:12px 0; }
  details.fold[open] summary{ border-bottom:1px solid var(--line); margin-bottom:12px; }
`;

export function renderHtml({ 오늘한일, 추천, 진도, 병목, 다음걸음, 잠든, 재료, 초안, 녹음, stamp }) {
  const stagesHtml = stages.map((s, i) =>
    `<span class="stage">${s}</span>${i < stages.length - 1 ? '<span class="arrow">→</span>' : ''}`).join('');
  const sleepHtml = 잠든.length
    ? `<div class="callout sleep"><div class="lbl">잠든 세션</div><div class="body">"${esc(잠든[0].name)}" — <b>${잠든[0].days}일째</b> 잠들어 있어요.${잠든.length > 1 ? ` (외 ${잠든.length - 1}개)` : ''}</div></div>`
    : '';
  const 오늘한일Html = 오늘한일.length ? 오늘한일.map(esc).join(' · ') : '<span class="dash">아직 없음</span>';
  const 추천Html = 추천.map(t => `<div class="adv-line">${esc(t)}</div>`).join('');
  const maxCount = Math.max(병목.counts.재료, 병목.counts.대본, 병목.counts.녹음, 병목.counts.발행, 1);

  const whoClass = (w) => w === '나' ? 'me' : w === 'AI' ? 'ai' : 'both';
  const 라인Html = 라인.map(r => `
    <div class="lane">
      <div class="lane-step">${esc(r.단계)}</div>
      <div class="lane-who ${whoClass(r.누가)}">${r.누가 === '나' ? '✋ 나' : r.누가 === 'AI' ? '🤖 AI' : '🤖+✋'}</div>
      <div class="lane-what">${esc(r.무엇)}</div>
      <div class="lane-tool">${r.도구 === '—' ? '<span class="dash">—</span>' : `<span class="chip">${esc(r.도구)}</span>`}</div>
      <div class="lane-save">${r.저장 === '—' ? '<span class="dash">—</span>' : esc(r.저장)}</div>
    </div>`).join('');
  const 점검Html = 점검.map(c => `
    <label class="check" for="chk-${c.id}">
      <input type="checkbox" id="chk-${c.id}" data-chk="${c.id}">
      <span class="check-k">${esc(c.k)}</span>
      <span class="check-d">${esc(c.d)}</span>
    </label>`).join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>하루 끝 — 세션 현황판</title>
<style>${STYLE}</style></head>
<body><div class="wrap">
  <h1>하루 끝 — 세션 현황판</h1>
  <p class="sub">상태 하나가 → 팔 수 있는 세션 한 벌이 되기까지. 오늘 뭐부터 할지 한 장.</p>
  <div class="pipeline">${stagesHtml}</div>

  <div class="callout today"><div class="lbl">오늘</div>
    <div class="today-row"><span class="today-k">✅ 오늘 한 일</span><span>${오늘한일Html}</span></div>
    <div class="today-row"><span class="today-k">▶ 오늘 할 일</span><span>${esc(다음걸음)}</span></div>
  </div>
  ${sleepHtml}
  <div class="callout adv"><div class="lbl">💡 추천</div>${추천Html}</div>

  <h2 class="sec-title">세션별 진도</h2>
  <div class="prows">${진도.length ? 진도.map(진도Row).join('') : '<div class="empty">— 아직 없음 —</div>'}</div>

  <h2 class="sec-title">어디서 막히나</h2>
  <div class="brows">
    ${병목Row('재료', 병목.counts.재료, maxCount)}
    ${병목Row('대본', 병목.counts.대본, maxCount)}
    ${병목Row('녹음', 병목.counts.녹음, maxCount)}
    ${병목Row('발행', 병목.counts.발행, maxCount)}
    <div class="brate">발행까지 ${병목.rate}%</div>
  </div>

  <div class="board">
    ${col('정리된 재료', 재료, '읽은 자료·자막 → 질문·과제 재료')}
    ${col('대본 초안', 초안, '아직 녹음 전')}
    ${col('녹음·발행', 녹음, '녹음까지 된 것')}
  </div>
  <div class="tally">
    <div class="t"><div class="n">${병목.counts.재료}</div><div class="k">재료</div></div>
    <div class="t"><div class="n">${병목.counts.대본}</div><div class="k">대본</div></div>
    <div class="t"><div class="n">${병목.counts.녹음}</div><div class="k">녹음</div></div>
    <div class="t"><div class="n">${병목.counts.발행}</div><div class="k">발행</div></div>
  </div>

  <details class="fold"><summary>세션 생산 라인 — 누가 무엇으로</summary>
    <div class="lanes">
      <div class="lane lane-head"><div>단계</div><div>누가</div><div>무엇을</div><div>스킬·도구</div><div>저장 위치</div></div>
      ${라인Html}
    </div>
  </details>
  <details class="fold"><summary>내보내기 전 점검 4칸</summary>
    <div class="checks">${점검Html}</div>
    <button class="check-reset" id="reset">모두 지우기 (새 세션 시작)</button>
  </details>

  <p class="foot">자동 생성 · ${stamp} · node automations/session-dashboard.mjs</p>
</div>
<script>
  (function(){
    var KEY='haru-check-v1', saved={};
    try{ saved=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ saved={}; }
    var boxes=document.querySelectorAll('input[data-chk]');
    boxes.forEach(function(b){
      b.checked=!!saved[b.dataset.chk];
      b.addEventListener('change',function(){ saved[b.dataset.chk]=b.checked; localStorage.setItem(KEY,JSON.stringify(saved)); });
    });
    var reset=document.getElementById('reset');
    if(reset) reset.addEventListener('click',function(){ saved={}; localStorage.removeItem(KEY); boxes.forEach(function(b){ b.checked=false; }); });
  })();
</script>
</body></html>`;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const list = (p) => existsSync(p)
  ? readdirSync(p).map(f => f.normalize('NFC')).filter(f => !f.startsWith('.') && !f.startsWith('_'))
  : [];

const matchFile = (names, display) => names.find(f => f.replace(/\.md$/, '') === display);

export function main() {
  const now = Date.now();
  const todayStr = kstDate(now);
  const 정리dir = join(ROOT, '자료함/정리');
  const outDir = join(ROOT, '하루끝-키트/outputs');
  const 발행path = join(ROOT, '하루끝-키트/발행.md');

  const 재료files = list(정리dir).filter(f => f.endsWith('.md'));
  const outFiles = list(outDir);
  const { 초안: 초안names, 녹음: 녹음names } = classifyOutputs(outFiles);
  const 발행keys = existsSync(발행path) ? parsePublished(readFileSync(발행path, 'utf8')) : new Set();
  const m4aKeySet = new Set(outFiles.filter(f => f.endsWith('.m4a')).map(f => mediaKey(f)));

  const meta = (dir, displayName, originalFile) => {
    const m = statSync(join(dir, originalFile)).mtime;
    return { name: displayName, date: `${m.getMonth() + 1}/${m.getDate()}`,
             days: daysSince(m.getTime(), now), stalled: false,
             isToday: kstDate(m.getTime()) === todayStr };
  };

  const 재료 = 재료files.map(f => { const m = meta(정리dir, f.replace(/\.md$/, ''), f); m.stalled = m.days >= 7; return m; })
    .sort((a, b) => (b.stalled - a.stalled) || (b.days - a.days));
  const 초안 = 초안names.map(d => { const m = meta(outDir, d, matchFile(outFiles, d)); m.stalled = m.days >= 7; return m; })
    .sort((a, b) => (b.stalled - a.stalled) || (b.days - a.days));
  const 녹음 = 녹음names.map(d => meta(outDir, d, matchFile(outFiles, d))).sort((a, b) => b.days - a.days);

  // 진도: 모든 항목(재료+대본+녹음)에 stageOf 적용
  const 진도raw = [
    ...재료.map(i => ({ ...i, isMaterial: true })),
    ...초안.map(i => ({ ...i, isMaterial: false })),
    ...녹음.map(i => ({ ...i, isMaterial: false })),
  ].map(i => {
    const hasM4a = m4aKeySet.has(mediaKey(i.name + '.md'));
    const stage = stageOf(i.name, 발행keys, hasM4a, i.isMaterial);
    return { name: i.name, stage, days: i.days, stalled: stage.step < 7 && i.days >= 7 };
  }).sort((a, b) => (a.stage.step - b.stage.step) || (b.days - a.days));

  // 병목 카운트(단계별)
  const counts = { 재료: 0, 대본: 0, 녹음: 0, 발행: 0 };
  for (const p of 진도raw) counts[p.stage.label]++;
  const 병목 = bottleneck(counts);

  // 오늘 한 일 / 잠든 / 추천
  const 오늘한일 = collectToday([...재료, ...초안, ...녹음]);
  const 잠든 = findStalled([...재료, ...초안]);
  const 늦은cand = 진도raw.filter(p => p.stage.step < 7 && p.days >= 7).sort((a, b) => b.days - a.days)[0];
  const 늦은 = 늦은cand ? { name: 늦은cand.name, days: 늦은cand.days, label: 늦은cand.stage.label } : null;
  const 다음걸음 = decideNextStep({ 초안: 초안names, 재료: 재료files.map(f => f.replace(/\.md$/, '')) });
  const 추천 = decideAdvice({ 늦은, 쌓인단계: 병목.쌓인단계, fallback: 다음걸음 });

  const stamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  // renderHtml 은 병목.counts 를 쓰므로 counts 를 합쳐 넘긴다(bottleneck 반환엔 counts 없음).
  const html = renderHtml({ 오늘한일, 추천, 진도: 진도raw, 병목: { ...병목, counts }, 다음걸음, 잠든, 재료, 초안, 녹음, stamp });
  writeFileSync(join(ROOT, '하루끝-키트/현황판.html'), html, 'utf8');
  console.log(`현황판 생성: 하루끝-키트/현황판.html`);
  console.log(`  재료 ${counts.재료} · 대본 ${counts.대본} · 녹음 ${counts.녹음} · 발행 ${counts.발행} · 발행률 ${병목.rate}%`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
