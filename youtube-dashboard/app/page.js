import { db } from '../lib/supabase.js';
import { fmt, delta, risingVideos } from '../lib/compute.js';

export const dynamic = 'force-dynamic';

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

function DeltaLine({ value, unit }) {
  if (value === null) return <div className="flat">어제 기록 없음</div>;
  if (value === 0) return <div className="flat">어제와 같음</div>;
  const cls = value > 0 ? 'up' : 'down';
  const sign = value > 0 ? '▲ +' : '▼ ';
  return <div className={cls}>{sign}{fmt(Math.abs(value))}{unit} (어제 대비)</div>;
}

export default async function Page() {
  let daily = [];
  let latestVideos = [];
  let prevVideos = [];
  let errMsg = '';
  try {
    const client = db();
    const d = await client
      .from('daily_snapshots')
      .select('*')
      .eq('channel_id', CHANNEL_ID)
      .order('captured_date', { ascending: false })
      .limit(2);
    if (d.error) throw new Error(d.error.message);
    daily = d.data || [];

    if (daily.length) {
      const latestDate = daily[0].captured_date;
      const lv = await client
        .from('video_snapshots')
        .select('*')
        .eq('channel_id', CHANNEL_ID)
        .eq('captured_date', latestDate)
        .order('published_at', { ascending: false });
      if (lv.error) throw new Error(lv.error.message);
      latestVideos = lv.data || [];
      if (daily[1]) {
        const pv = await client
          .from('video_snapshots')
          .select('video_id, views')
          .eq('channel_id', CHANNEL_ID)
          .eq('captured_date', daily[1].captured_date);
        if (pv.error) throw new Error(pv.error.message);
        prevVideos = pv.data || [];
      }
    }
  } catch (e) {
    errMsg = String((e && e.message) || e);
  }

  const today = daily[0];
  const yest = daily[1];
  const rising = risingVideos(latestVideos, prevVideos, 5);
  const recent = latestVideos.slice(0, 6);

  return (
    <div className="wrap">
      <h1 className="title">{(today && today.title) || '유튜브 채널 리포트'}</h1>
      <p className="sub">매일 아침 8시 자동 갱신{today ? ` · 마지막 기록 ${today.captured_date}` : ''}</p>

      {errMsg ? (
        <div className="empty">저장소 연결 오류: {errMsg}</div>
      ) : !today ? (
        <div className="empty">
          아직 수집된 데이터가 없어요.<br />
          내일 아침 8시에 첫 기록이 쌓이거나, 지금 수집을 한 번 돌리면 바로 보입니다.
        </div>
      ) : (
        <>
          <div className="grid">
            <div className="card">
              <div className="label">구독자</div>
              <div className="big">{fmt(today.subscribers)}</div>
              <DeltaLine value={yest ? delta(today.subscribers, yest.subscribers) : null} unit="명" />
            </div>
            <div className="card">
              <div className="label">누적 조회수</div>
              <div className="big">{fmt(today.total_views)}</div>
              <DeltaLine value={yest ? delta(today.total_views, yest.total_views) : null} unit="회" />
            </div>
            <div className="card">
              <div className="label">총 영상 수</div>
              <div className="big">{fmt(today.total_videos)}</div>
              <DeltaLine value={yest ? delta(today.total_videos, yest.total_videos) : null} unit="개" />
            </div>
          </div>

          {rising.length > 0 && (
            <div className="section">
              <h2>📈 인기 급상승 (어제보다 조회수 많이 오른 영상)</h2>
              {rising.map((v) => (
                <div className="vid" key={v.video_id}>
                  {v.thumbnail ? <img src={v.thumbnail} alt="" width={120} height={68} /> : null}
                  <div>
                    <div className="vtitle">{v.title}</div>
                    <div className="vmeta">조회수 {fmt(v.views)}회 · 어제보다 ▲ +{fmt(v.viewDelta)}회</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="section">
            <h2>🆕 최근 올라온 영상</h2>
            {recent.map((v) => (
              <div className="vid" key={v.video_id}>
                {v.thumbnail ? <img src={v.thumbnail} alt="" width={120} height={68} /> : null}
                <div>
                  <div className="vtitle">{v.title}</div>
                  <div className="vmeta">{v.published_at} · 조회수 {fmt(v.views)}회 · 좋아요 {fmt(v.likes)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="foot">데이터: YouTube Data API · 저장: Supabase · 갱신: 매일 08:00 KST</div>
    </div>
  );
}
