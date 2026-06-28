// YouTube Data API v3 호출 모음. 키는 인자로만 받고 절대 로그에 찍지 않는다.
const API = 'https://www.googleapis.com/youtube/v3';

// 한국 시간(KST = UTC+9) 기준 날짜 'YYYY-MM-DD'
export function kstDate(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return k.toISOString().slice(0, 10);
}

export async function fetchChannel(channelId, key) {
  const u = new URL(API + '/channels');
  u.search = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: channelId,
    key,
  });
  const r = await fetch(u, { cache: 'no-store' });
  const j = await r.json();
  if (j.error) throw new Error('channels: ' + j.error.message);
  const c = j.items && j.items[0];
  if (!c) throw new Error('채널을 찾을 수 없음: ' + channelId);
  return {
    channelId: c.id,
    title: c.snippet.title,
    thumbnail: (c.snippet.thumbnails && c.snippet.thumbnails.default && c.snippet.thumbnails.default.url) || '',
    subscribers: Number(c.statistics.subscriberCount || 0),
    totalViews: Number(c.statistics.viewCount || 0),
    totalVideos: Number(c.statistics.videoCount || 0),
    uploadsPlaylist: c.contentDetails.relatedPlaylists.uploads,
  };
}

export async function fetchRecentVideos(uploadsPlaylist, key, max = 25) {
  const p = new URL(API + '/playlistItems');
  p.search = new URLSearchParams({
    part: 'contentDetails',
    playlistId: uploadsPlaylist,
    maxResults: String(max),
    key,
  });
  const r = await fetch(p, { cache: 'no-store' });
  const j = await r.json();
  if (j.error) throw new Error('playlistItems: ' + j.error.message);
  const ids = (j.items || []).map((i) => i.contentDetails.videoId).filter(Boolean);
  if (!ids.length) return [];

  const v = new URL(API + '/videos');
  v.search = new URLSearchParams({ part: 'snippet,statistics', id: ids.join(','), key });
  const r2 = await fetch(v, { cache: 'no-store' });
  const j2 = await r2.json();
  if (j2.error) throw new Error('videos: ' + j2.error.message);
  return (j2.items || []).map((x) => ({
    videoId: x.id,
    title: x.snippet.title,
    publishedAt: x.snippet.publishedAt.slice(0, 10),
    thumbnail: (x.snippet.thumbnails && x.snippet.thumbnails.medium && x.snippet.thumbnails.medium.url) || '',
    views: Number(x.statistics.viewCount || 0),
    likes: Number(x.statistics.likeCount || 0),
  }));
}
