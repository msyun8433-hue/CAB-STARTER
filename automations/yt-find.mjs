// 주제 관련 조회수 높은 유튜브 영상 찾기
// 키는 .env 에서 직접 읽어 쓰고, 결과(JSON)만 출력한다 (키는 화면에 안 띄움).
import { readFileSync } from 'node:fs';

function loadKey() {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const m = env.match(/^YOUTUBE_API_KEY=(.+)$/m);
  if (!m) throw new Error('.env 에 YOUTUBE_API_KEY 가 없습니다');
  let k = m[1].trim().replace(/^["']|["']$/g, '').trim();
  // 진단(키 미노출): 길이/시작/특수문자 포함 여부만
  process.stderr.write(`[진단] 길이:${k.length} 시작:${k.slice(0,4)} 따옴표나공백포함:${/["'\s]/.test(k)}\n`);
  return k;
}

const KEY = loadKey();
const QUERIES = [
  '나와의 대화법',
  '자기 자신 이해하기',
  '나에게 던지는 질문',
  '자기 성찰 방법',
  '나를 아는 법 심리',
  '자존감 나 자신',
];
// 주제와 무관한 바이럴(반려동물·음악·공포·먹방 등) 제거
const EXCLUDE = /강아지|고양이|냥|홈캠|반려|펫|playlist|플레이리스트|음악|수면|asmr|공포|괴담|먹방|요리|여교수|남편|솔로지옥|브이로그|힐링음악/i;
// 주제 신호가 있는 제목 우대
const INCLUDE = /나 자신|자신과|나와의|내면|자존감|질문|성찰|마음|대화|혼자|나를 아|감정/;

async function searchIds(q) {
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.search = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '25',
    order: 'viewCount', regionCode: 'KR', relevanceLanguage: 'ko',
    q, key: KEY,
  });
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error('search 오류: ' + j.error.message);
  return j.items.map(i => i.id.videoId).filter(Boolean);
}

async function stats(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const u = new URL('https://www.googleapis.com/youtube/v3/videos');
    u.search = new URLSearchParams({
      part: 'snippet,statistics,contentDetails', id: chunk.join(','), key: KEY,
    });
    const r = await fetch(u);
    const j = await r.json();
    if (j.error) throw new Error('videos 오류: ' + j.error.message);
    for (const v of j.items) {
      out.push({
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        date: v.snippet.publishedAt.slice(0, 10),
        views: Number(v.statistics.viewCount || 0),
        duration: v.contentDetails.duration,
      });
    }
  }
  return out;
}

const idSet = new Set();
for (const q of QUERIES) {
  try { (await searchIds(q)).forEach(id => idSet.add(id)); }
  catch (e) { console.error('[' + q + ']', e.message); }
}
const all = await stats([...idSet]);
// 길이(초) 계산해서 너무 긴 음악/라이브(>70분) 와 노이즈 제거
function durSec(d) {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+(m[1]||0))*3600 + (+(m[2]||0))*60 + (+(m[3]||0));
}
const filtered = all
  .filter(v => !EXCLUDE.test(v.title))
  .filter(v => INCLUDE.test(v.title))
  .filter(v => durSec(v.duration) <= 70*60);
filtered.sort((a, b) => b.views - a.views);
console.log(JSON.stringify(filtered.slice(0, 12), null, 0));
