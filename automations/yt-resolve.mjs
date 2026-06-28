// 채널 이름 → 채널 ID 후보 찾기. 키는 .env에서 읽고 화면에 안 띄움.
import { readFileSync } from 'node:fs';

function loadKey() {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const m = env.match(/^YOUTUBE_API_KEY=(.+)$/m);
  if (!m) throw new Error('.env 에 YOUTUBE_API_KEY 가 없습니다');
  return m[1].trim().replace(/^["']|["']$/g, '').trim();
}

const KEY = loadKey();
const QUERY = process.argv[2] || '태오의 실행 비즈니스';

async function searchChannels(q) {
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.search = new URLSearchParams({
    part: 'snippet', type: 'channel', maxResults: '10',
    regionCode: 'KR', relevanceLanguage: 'ko', q, key: KEY,
  });
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error('search 오류: ' + j.error.message);
  return j.items.map(i => ({
    channelId: i.snippet.channelId,
    title: i.snippet.channelTitle,
    desc: (i.snippet.description || '').slice(0, 80),
  }));
}

async function channelStats(ids) {
  const u = new URL('https://www.googleapis.com/youtube/v3/channels');
  u.search = new URLSearchParams({
    part: 'snippet,statistics', id: ids.join(','), key: KEY,
  });
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error('channels 오류: ' + j.error.message);
  return (j.items || []).map(c => ({
    channelId: c.id,
    title: c.snippet.title,
    customUrl: c.snippet.customUrl || '',
    subs: Number(c.statistics.subscriberCount || 0),
    views: Number(c.statistics.viewCount || 0),
    videos: Number(c.statistics.videoCount || 0),
  }));
}

const cands = await searchChannels(QUERY);
if (!cands.length) { console.log('후보 없음'); process.exit(0); }
const stats = await channelStats(cands.map(c => c.channelId));
const byId = Object.fromEntries(stats.map(s => [s.channelId, s]));
const merged = cands.map(c => ({ ...c, ...(byId[c.channelId] || {}) }));
console.log(JSON.stringify(merged, null, 2));
