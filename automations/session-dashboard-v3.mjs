// 세션 생산 보드 v3 — 진행 현황 + '누가 뭘 하나'(역할 지도) + 내보내기 전 점검
// 상태 하나가 → 팔 수 있는 세션 한 벌이 되기까지, 한 장으로 본다.
// 실행: node automations/session-dashboard-v3.mjs  →  하루끝-키트/대시보드.html
import { readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STALL = 7;                 // 며칠 이상 멈추면 '잠듦'
const now = Date.now();
const norm = s => s.toLowerCase().replace(/[\s,._\-]/g, '');
// macOS 한글 파일명은 분해형(NFD) → 조합형(NFC)으로 맞춰야 비교가 된다.
const list = (p) => existsSync(p) ? readdirSync(p).map(f => f.normalize('NFC')).filter(f => !f.startsWith('.') && !f.startsWith('_')) : [];
const clean = f => f.replace(/\.md$/, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 파일들을 {이름, 날짜, 며칠째, 잠듦} 으로. 잠든 것 먼저, 오래된 순.
function items(dir, files, stallable = true) {
  return files.map(f => {
    const m = statSync(join(dir, f)).mtime;
    const days = Math.floor((now - m.getTime()) / 86400000);
    return { name: clean(f), days, date: `${m.getMonth() + 1}/${m.getDate()}`, stalled: stallable && days >= STALL };
  }).sort((a, b) => (b.stalled - a.stalled) || (b.days - a.days));
}

const 정리dir = join(ROOT, '자료함/정리');
const outDir = join(ROOT, '하루끝-키트/outputs');
const 재료files = list(정리dir).filter(f => f.endsWith('.md'));
const outFiles = list(outDir);
const m4a = outFiles.filter(f => f.endsWith('.m4a')).map(norm);
const scripts = outFiles.filter(f => f.endsWith('.md') && (f.startsWith('오디오대본') || f.startsWith('세션')));
const key = f => norm(f.replace(/^오디오대본_?/, '').replace(/^세션_?/, '').replace(/\.md$/, ''));
const 초안files = [], 녹음files = [];
for (const s of scripts) (m4a.some(m => m.includes(key(s))) ? 녹음files : 초안files).push(s);

const 재료 = items(정리dir, 재료files);
const 초안 = items(outDir, 초안files);
const 녹음 = items(outDir, 녹음files, false);   // 녹음 완료는 '잠듦' 아님

// 잠든 세션(재료·초안 중 7일+)
const 잠든 = [...재료, ...초안].filter(i => i.stalled).sort((a, b) => b.days - a.days);
const sleep = 잠든.length
  ? `“${esc(잠든[0].name)}” — <b>${잠든[0].days}일째</b> 잠들어 있어요.${잠든.length > 1 ? ` (외 ${잠든.length - 1}개)` : ''}`
  : null;

// 다음 한 걸음
let nextStep;
if (초안.length) {
  const pick = 초안.find(i => 초안files.find(f => clean(f) === i.name && f.startsWith('세션'))) || 초안[0];
  nextStep = `“${esc(pick.name)}” — 대본은 됐어요. <b>읽고 녹음</b>하면 발행 후보가 됩니다.`;
} else if (재료.length) {
  nextStep = `정리된 재료 ${재료.length}개가 기다려요. 그중 하나로 <b>질문지·대본</b>을 만들어 보세요.`;
} else {
  nextStep = `새 상태 하나를 골라 <b>세션을 시작</b>해 보세요.`;
}

// ── ③ 역할 지도: 단계마다 누가 / 무엇으로 / 어디에 ──────────────
// done: 이 단계까지 닿은 세션 개수(대략) — 진행 칸과 묶어 한눈에 보이게.
const STAGES = [
  { name: '상태',      who: '나', tool: '내가 고른다',          place: '머릿속·메모',        done: null },
  { name: '재료 모으기', who: 'AI', tool: 'YouTube + 자막',       place: '자료함/정리',         done: 재료.length },
  { name: '질문지·과제', who: 'AI', tool: '질문과제정리 스킬',     place: '하루끝-키트/outputs', done: null },
  { name: '대본 초안',   who: 'AI', tool: '녹음대본 스킬',         place: '하루끝-키트/outputs', done: scripts.length },
  { name: 'AI티 빼기',   who: 'AI', tool: 'humanize-korean',       place: '같은 대본 위',        done: null },
  { name: '결 점검',     who: 'AI', tool: '결다듬기 스킬',         place: '같은 대본 위',        done: null },
  { name: '발행',        who: '나', tool: '최종 문장 · 녹음 목소리', place: '노션 · 사이트',       done: 녹음.length },
];

const whoTag = w => w === '나'
  ? '<span class="who me">✋ 내가</span>'
  : '<span class="who ai">AI</span>';

const roleRows = STAGES.map((s, i) => `
  <div class="role">
    <div class="rnum">${i + 1}</div>
    <div class="rname">${esc(s.name)}${s.done != null ? `<span class="rdone">${s.done}</span>` : ''}</div>
    <div class="rwho">${whoTag(s.who)}</div>
    <div class="rtool">${esc(s.tool)}</div>
    <div class="rplace">${esc(s.place)}</div>
  </div>`).join('');

// ── ⑤ 내보내기 전 점검 (체크는 브라우저에 저장) ──────────────
const CHECKS = [
  { k: 'ban',    t: '금지어 0',        d: '치유·회복·성장·명상·소마틱… 한 개도 없는가' },
  { k: 'mirror', t: '거울이다',        d: '비춰만 준다. 코치·조언·판정이 섞이지 않았는가' },
  { k: 'noai',   t: 'AI티 없다',       d: '기계 말투·과장·번역체가 지워졌는가' },
  { k: 'mine',   t: '최종 문장은 내가', d: '마지막 한 줄·목소리는 내 손을 거쳤는가' },
];
const checkRows = CHECKS.map(c => `
  <label class="chk" data-k="${c.k}">
    <input type="checkbox" />
    <span class="ctxt"><b>${c.t}</b><span class="cdesc">${c.d}</span></span>
  </label>`).join('');

const badge = i => `${i.date} 손댐 · ${i.days === 0 ? '오늘' : i.days + '일째'}${i.stalled ? ' · 잠듦' : ''}`;
const card = (title, arr, hint) => `
  <section class="col">
    <h2>${title} <span class="count">${arr.length}</span></h2>
    <p class="hint">${hint}</p>
    ${arr.length ? arr.map(i => `<div class="item${i.stalled ? ' stalled' : ''}">
        <div class="iname">${esc(i.name)}</div><div class="ibadge">${badge(i)}</div>
      </div>`).join('') : '<div class="empty">— 아직 없음 —</div>'}
  </section>`;

const stages = STAGES.map(s => s.name);
const stagesHtml = stages.map((s, i) => `<span class="stage">${esc(s)}</span>${i < stages.length - 1 ? '<span class="arrow">→</span>' : ''}`).join('');
const stamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>하루 끝 — 세션 생산 보드</title>
<style>
  :root{ --bg:#f7f5f0; --ink:#2b2925; --muted:#8a8479; --line:#e3ded4; --accent:#6b7d6a; --accentbg:#eef1ea;
    --warn:#c2742e; --warnbg:#fbf1e4; --warnline:#e9cfa8; --me:#9a6b4f; --mebg:#f3ebe3; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; line-height:1.6; }
  .wrap{ max-width:980px; margin:0 auto; padding:40px 24px 64px; }
  h1{ font-size:24px; font-weight:600; margin:0 0 4px; }
  .sub{ color:var(--muted); font-size:14px; margin:0 0 24px; }
  .pipeline{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:12px 16px; background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:20px; }
  .stage{ font-size:13px; padding:4px 10px; background:var(--bg); border-radius:8px; } .arrow{ color:var(--muted); font-size:12px; }
  h3{ font-size:13px; font-weight:600; color:var(--muted); letter-spacing:.02em; margin:28px 0 10px; }
  .callout{ border-radius:16px; padding:16px 20px; margin-bottom:14px; }
  .next{ background:var(--accentbg); border:1px solid #d4ddd0; }
  .sleep{ background:var(--warnbg); border:1px solid var(--warnline); }
  .lbl{ font-size:12px; font-weight:600; letter-spacing:.02em; margin-bottom:6px; }
  .next .lbl{ color:var(--accent); } .sleep .lbl{ color:var(--warn); }
  .callout .body{ font-size:16px; }
  /* 역할 지도 */
  .roles{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:6px 16px; }
  .role{ display:grid; grid-template-columns:26px 1.5fr 64px 1.6fr 1.3fr; gap:10px; align-items:center; padding:11px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
  .role:last-child{ border-bottom:none; }
  .rnum{ width:24px; height:24px; border-radius:50%; background:var(--bg); color:var(--muted); font-size:12px; display:flex; align-items:center; justify-content:center; }
  .rname{ font-weight:600; display:flex; align-items:center; gap:7px; }
  .rdone{ font-size:11px; font-weight:600; color:#fff; background:var(--accent); border-radius:20px; padding:0 8px; }
  .who{ font-size:11.5px; font-weight:600; border-radius:20px; padding:2px 9px; white-space:nowrap; }
  .who.ai{ background:var(--accentbg); color:var(--accent); }
  .who.me{ background:var(--mebg); color:var(--me); }
  .rtool{ color:var(--ink); } .rplace{ color:var(--muted); font-size:12.5px; }
  /* 진행 보드 */
  .board{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:8px; }
  .col{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 16px 20px; }
  .col h2{ font-size:15px; font-weight:600; margin:0 0 2px; display:flex; align-items:center; gap:8px; }
  .count{ font-size:12px; color:#fff; background:var(--accent); border-radius:20px; padding:1px 9px; }
  .hint{ font-size:12px; color:var(--muted); margin:0 0 12px; }
  .item{ padding:9px 11px; border:1px solid var(--line); border-radius:10px; margin-bottom:8px; background:#fcfbf8; }
  .item.stalled{ border-color:var(--warnline); background:var(--warnbg); }
  .iname{ font-size:13.5px; } .ibadge{ font-size:11.5px; color:var(--muted); margin-top:3px; }
  .item.stalled .ibadge{ color:var(--warn); }
  .empty{ font-size:13px; color:var(--muted); padding:8px 0; }
  /* 점검 */
  .checks{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:8px 18px; }
  .chk{ display:flex; gap:12px; align-items:flex-start; padding:13px 0; border-bottom:1px solid var(--line); cursor:pointer; }
  .chk:last-child{ border-bottom:none; }
  .chk input{ width:19px; height:19px; margin-top:2px; accent-color:var(--accent); flex:none; }
  .ctxt{ display:flex; flex-direction:column; } .ctxt b{ font-size:14px; }
  .cdesc{ font-size:12.5px; color:var(--muted); }
  .chk.on .ctxt b{ color:var(--accent); }
  .ready{ margin-top:12px; font-size:13px; padding:11px 14px; border-radius:10px; text-align:center; }
  .ready.no{ background:var(--bg); color:var(--muted); } .ready.yes{ background:var(--accentbg); color:var(--accent); font-weight:600; }
  /* 집계 */
  .tally{ display:flex; gap:12px; margin-top:22px; }
  .tally .t{ flex:1; background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; text-align:center; }
  .tally .n{ font-size:28px; font-weight:600; color:var(--accent); } .tally .k{ font-size:12px; color:var(--muted); margin-top:2px; }
  .foot{ margin-top:26px; font-size:12px; color:var(--muted); text-align:center; }
  @media(max-width:760px){
    .board{grid-template-columns:1fr;} .tally{flex-direction:column;}
    .role{ grid-template-columns:22px 1fr auto; row-gap:3px; }
    .rtool{ grid-column:2/4; color:var(--muted); font-size:12.5px; } .rplace{ grid-column:2/4; }
  }
</style></head>
<body><div class="wrap">
  <h1>하루 끝 — 세션 생산 보드</h1>
  <p class="sub">상태 하나가 → 팔 수 있는 세션 한 벌이 되기까지. 내가 보는 진행 한 장.</p>
  <div class="pipeline">${stagesHtml}</div>

  ${sleep ? `<div class="callout sleep"><div class="lbl">잠든 세션</div><div class="body">${sleep}</div></div>` : ''}
  <div class="callout next"><div class="lbl">다음 한 걸음</div><div class="body">${nextStep}</div></div>

  <h3>누가 무엇으로 — 단계별 역할</h3>
  <div class="roles">${roleRows}</div>

  <h3>지금 어디까지 왔나</h3>
  <div class="board">
    ${card('정리된 재료', 재료, '읽은 자료·자막 → 질문·과제 재료')}
    ${card('대본 초안', 초안, '아직 녹음 전')}
    ${card('녹음·발행', 녹음, '녹음까지 된 것')}
  </div>
  <div class="tally">
    <div class="t"><div class="n">${재료.length}</div><div class="k">모은 재료</div></div>
    <div class="t"><div class="n">${scripts.length}</div><div class="k">만든 세션·대본</div></div>
    <div class="t"><div class="n">${녹음.length}</div><div class="k">녹음까지</div></div>
  </div>

  <h3>내보내기 전 점검 — 이 네 칸이 다 차야 발행</h3>
  <div class="checks">
    ${checkRows}
    <div class="ready no" id="ready">0 / ${CHECKS.length} — 아직 점검 중</div>
  </div>

  <p class="foot">자동 생성 · ${stamp} · node automations/session-dashboard-v3.mjs</p>
</div>
<script>
  // 점검 체크는 이 브라우저에 저장된다(파일을 다시 만들어도 유지).
  var KEY='haru_checks_v1', total=${CHECKS.length};
  var saved=JSON.parse(localStorage.getItem(KEY)||'{}');
  var labels=document.querySelectorAll('.chk');
  function refresh(){
    var n=0;
    labels.forEach(function(l){ if(l.querySelector('input').checked){ n++; l.classList.add('on'); } else l.classList.remove('on'); });
    var r=document.getElementById('ready');
    if(n===total){ r.className='ready yes'; r.textContent='✓ 네 칸 다 찼어요 — 발행해도 됩니다'; }
    else{ r.className='ready no'; r.textContent=n+' / '+total+' — 아직 점검 중'; }
  }
  labels.forEach(function(l){
    var k=l.dataset.k, box=l.querySelector('input');
    box.checked=!!saved[k];
    box.addEventListener('change', function(){ saved[k]=box.checked; localStorage.setItem(KEY, JSON.stringify(saved)); refresh(); });
  });
  refresh();
</script>
</body></html>`;

writeFileSync(join(ROOT, '하루끝-키트/대시보드.html'), html, 'utf8');
console.log('세션 생산 보드 생성: 하루끝-키트/대시보드.html');
console.log(`  재료 ${재료.length} · 초안 ${초안.length} · 녹음 ${녹음.length} · 잠든 ${잠든.length}`);
if (sleep) console.log('  잠든 세션: ' + sleep.replace(/<[^>]+>/g, ''));
