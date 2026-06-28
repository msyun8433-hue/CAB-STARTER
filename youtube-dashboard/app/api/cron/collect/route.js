import { NextResponse } from 'next/server';
import { fetchChannel, fetchRecentVideos, kstDate } from '../../../../lib/youtube.js';
import { db } from '../../../../lib/supabase.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req) {
  // Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 를 보낸다.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 });
    }
  }
  try {
    const key = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    if (!key || !channelId) throw new Error('YOUTUBE 환경변수 없음');

    const ch = await fetchChannel(channelId, key);
    const vids = await fetchRecentVideos(ch.uploadsPlaylist, key, 25);
    const date = kstDate();
    const client = db();

    const { error: e1 } = await client.from('daily_snapshots').upsert(
      {
        channel_id: ch.channelId,
        captured_date: date,
        title: ch.title,
        subscribers: ch.subscribers,
        total_views: ch.totalViews,
        total_videos: ch.totalVideos,
      },
      { onConflict: 'channel_id,captured_date' }
    );
    if (e1) throw new Error('daily upsert: ' + e1.message);

    if (vids.length) {
      const rows = vids.map((v) => ({
        channel_id: ch.channelId,
        captured_date: date,
        video_id: v.videoId,
        title: v.title,
        published_at: v.publishedAt,
        thumbnail: v.thumbnail,
        views: v.views,
        likes: v.likes,
      }));
      const { error: e2 } = await client
        .from('video_snapshots')
        .upsert(rows, { onConflict: 'channel_id,captured_date,video_id' });
      if (e2) throw new Error('video upsert: ' + e2.message);
    }
    return NextResponse.json({ ok: true, date, subscribers: ch.subscribers, videos: vids.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e && e.message) || e) }, { status: 500 });
  }
}
