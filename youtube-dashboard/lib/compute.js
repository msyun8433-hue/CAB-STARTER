export function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

export function delta(today, prev) {
  if (prev === null || prev === undefined) return null;
  return Number(today || 0) - Number(prev || 0);
}

// 급상승 = 어제 스냅샷이 있는 영상의 조회수 증가폭(viewDelta>0)만, 큰 순.
// 어제 스냅샷에 없던 새 영상은 기준이 없어 viewDelta 0 처리되어 제외된다
// (새 영상은 '최근 올라온 영상' 섹션에 표시되므로 누락 아님).
// latestRows: 최신 날짜 video_snapshots, prevRows: 직전 날짜 video_snapshots
export function risingVideos(latestRows, prevRows, limit = 5) {
  const prevMap = new Map((prevRows || []).map((r) => [r.video_id, Number(r.views || 0)]));
  return (latestRows || [])
    .map((v) => ({ ...v, viewDelta: Number(v.views || 0) - (prevMap.get(v.video_id) ?? Number(v.views || 0)) }))
    .filter((v) => v.viewDelta > 0)
    .sort((a, b) => b.viewDelta - a.viewDelta)
    .slice(0, limit);
}
