# 유튜브 채널 대시보드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지정한 유튜브 채널(태오의 실행 비즈니스)의 수치를 매일 아침 8시(KST)에 자동 수집해, 어제 대비 증감과 함께 웹사이트 한 페이지로 보여준다.

**Architecture:** Next.js(App Router) 단일 앱을 Vercel에 배포한다. Vercel Cron이 매일 23:00 UTC(=08:00 KST)에 `/api/cron/collect`를 호출 → YouTube Data API v3로 채널·영상 수치를 받아 Supabase의 `daily_snapshots`·`video_snapshots`에 그날치(스냅샷)를 upsert한다. 대시보드 페이지(서버 컴포넌트)는 최근 두 스냅샷을 읽어 증감을 계산해 카드 UI로 렌더링한다.

**Tech Stack:** Next.js 15 (App Router, JS), React 19, @supabase/supabase-js, YouTube Data API v3, Vercel(배포+Cron), Supabase(Postgres).

## Global Constraints

- 대상 채널: `UCoiqKDFftEDHBfc_X8rteFg` (`@teoactbusiness`, 태오의 실행 비즈니스).
- 비밀값은 환경변수로만. `YOUTUBE_API_KEY`·`SUPABASE_KEY`는 **서버에서만** 사용하고 브라우저로 내보내지 않는다 (`NEXT_PUBLIC_` 접두사 금지).
- 배포는 **`youtube-dashboard/` 폴더만** 올린다. 사업 폴더 전체·루트 `.env`·고객정보는 절대 올리지 않는다 (CLAUDE.md §10).
- 폴더·라우트·파일명은 영어로 (한글명은 Vercel에서 404 전례 있음).
- Supabase 프로젝트: `ptluntkhhszuircqztjr` (서울, 이미 깨워둠). 기존 테이블 `custom_meditations`는 건드리지 않는다.
- 시간 기준 날짜는 항상 KST(UTC+9). Vercel Cron schedule은 UTC 기준 `0 23 * * *`.
- 환경변수 이름(앱 코드가 기대하는 것): `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_KEY`, `CRON_SECRET`.

**현재 상태(스캐폴딩 일부 존재):** `youtube-dashboard/` 에 `package.json`, `next.config.mjs`, `vercel.json`, `.gitignore`, `lib/youtube.js`, `lib/supabase.js` 가 이미 작성돼 있다. 각 태스크는 이 파일들을 검증/수정/확장한다.

---

### Task 1: Supabase 스냅샷 테이블 생성

**Files:**
- Supabase migration (MCP `apply_migration`, name: `youtube_dashboard_tables`)

**Interfaces:**
- Produces: 테이블 `daily_snapshots(channel_id text, captured_date date, title text, subscribers bigint, total_views bigint, total_videos int, created_at timestamptz)` with UNIQUE(channel_id, captured_date); 테이블 `video_snapshots(channel_id text, captured_date date, video_id text, title text, published_at date, thumbnail text, views bigint, likes bigint, created_at timestamptz)` with UNIQUE(channel_id, captured_date, video_id).

- [ ] **Step 1: 마이그레이션 적용**

MCP `apply_migration` (project_id `ptluntkhhszuircqztjr`, name `youtube_dashboard_tables`):

```sql
create table if not exists public.daily_snapshots (
  id bigint generated always as identity primary key,
  channel_id text not null,
  captured_date date not null,
  title text,
  subscribers bigint not null default 0,
  total_views bigint not null default 0,
  total_videos int not null default 0,
  created_at timestamptz not null default now(),
  unique (channel_id, captured_date)
);

create table if not exists public.video_snapshots (
  id bigint generated always as identity primary key,
  channel_id text not null,
  captured_date date not null,
  video_id text not null,
  title text,
  published_at date,
  thumbnail text,
  views bigint not null default 0,
  likes bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (channel_id, captured_date, video_id)
);

create index if not exists idx_daily_channel_date
  on public.daily_snapshots (channel_id, captured_date desc);
create index if not exists idx_video_channel_date
  on public.video_snapshots (channel_id, captured_date desc);

-- 공개 비민감 데이터. RLS 비활성(서버 전용 키로만 접근, 브라우저 노출 없음).
alter table public.daily_snapshots disable row level security;
alter table public.video_snapshots disable row level security;
```

- [ ] **Step 2: 생성 확인**

MCP `list_tables` (project_id `ptluntkhhszuircqztjr`, schemas `["public"]`).
Expected: 목록에 `public.daily_snapshots`, `public.video_snapshots` 포함.

---

### Task 2: YouTube 라이브러리 검증 (live smoke + 단위 테스트)

**Files:**
- Verify: `youtube-dashboard/lib/youtube.js` (이미 존재)
- Test: `youtube-dashboard/lib/youtube.test.mjs` (Create)

**Interfaces:**
- Consumes: 루트 `.env` 의 `YOUTUBE_API_KEY` (테스트용으로만 읽음).
- Produces: `fetchChannel(channelId, key) -> {channelId, title, thumbnail, subscribers, totalViews, totalVideos, uploadsPlaylist}`; `fetchRecentVideos(uploadsPlaylist, key, max) -> [{videoId,title,publishedAt,thumbnail,views,likes}]`; `kstDate(date?) -> 'YYYY-MM-DD'`.

- [ ] **Step 1: kstDate 단위 테스트 작성 (실패 먼저)**

Create `youtube-dashboard/lib/youtube.test.mjs`:

```js
import assert from 'node:assert';
import { kstDate } from './youtube.js';

// 2026-06-21T20:00:00Z 는 KST 로 2026-06-22 05:00 → 날짜 2026-06-22
assert.equal(kstDate(new Date('2026-06-21T20:00:00Z')), '2026-06-22', 'UTC 저녁→KST 다음날');
// 2026-06-21T10:00:00Z 는 KST 19:00 → 2026-06-21
assert.equal(kstDate(new Date('2026-06-21T10:00:00Z')), '2026-06-21', 'UTC 낮→KST 같은날');
console.log('kstDate OK');
```

- [ ] **Step 2: 테스트 실행 (통과 확인)**

Run: `cd youtube-dashboard && node lib/youtube.test.mjs`
Expected: `kstDate OK` 출력, 종료코드 0. (kstDate 는 이미 구현돼 있어 통과해야 함. 실패하면 youtube.js 의 kstDate 를 고친다.)

- [ ] **Step 3: 실채널 라이브 스모크 테스트**

Run (루트에서):
```bash
node -e "import('./youtube-dashboard/lib/youtube.js').then(async m=>{const fs=await import('node:fs');const env=fs.readFileSync('.env','utf8');const key=env.match(/YOUTUBE_API_KEY=(.+)/)[1].trim();const ch=await m.fetchChannel('UCoiqKDFftEDHBfc_X8rteFg',key);console.log('subs',ch.subscribers,'videos',ch.totalVideos,'uploads',ch.uploadsPlaylist);const v=await m.fetchRecentVideos(ch.uploadsPlaylist,key,5);console.log('recent',v.length,v[0]&&v[0].title);})"
```
Expected: `subs` 13000대 숫자, `uploads` 가 `UU...` 로 시작, `recent 5` 와 영상 제목 1개 출력. (키 값은 화면에 안 찍힘.)

- [ ] **Step 4: 커밋 없음 (git 미사용 환경)**

이 저장소는 git 저장소가 아니다. 커밋 단계는 생략하고, 대신 변경 파일이 디스크에 저장됐는지만 확인한다.

---

### Task 3: 수집 라우트 `/api/cron/collect`

**Files:**
- Verify/Use: `youtube-dashboard/lib/supabase.js` (이미 존재: `db()` 반환 supabase client)
- Create: `youtube-dashboard/app/api/cron/collect/route.js`

**Interfaces:**
- Consumes: `fetchChannel`, `fetchRecentVideos`, `kstDate` (Task 2); `db()` (supabase.js); env `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_KEY`, `CRON_SECRET`.
- Produces: `GET /api/cron/collect` → 인증 통과 시 채널·영상 스냅샷을 그날(KST) 날짜로 upsert하고 `{ok:true,date,subscribers,videos}` JSON 반환. 인증 실패 시 401.

- [ ] **Step 1: 라우트 작성**

Create `youtube-dashboard/app/api/cron/collect/route.js`:

```js
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
```

- [ ] **Step 2: 빌드로 라우트 타입/임포트 검증**

(env 없이 로컬 실행은 불가하므로 빌드로 임포트 경로만 검증.) Task 5 의 빌드 단계에서 함께 확인한다. 여기서는 파일 존재만 확인:
Run: `ls youtube-dashboard/app/api/cron/collect/route.js`
Expected: 경로 출력.

---

### Task 4: 대시보드 페이지 (서버 컴포넌트 + 증감 계산)

**Files:**
- Create: `youtube-dashboard/app/layout.js`
- Create: `youtube-dashboard/app/globals.css`
- Create: `youtube-dashboard/app/page.js`
- Create: `youtube-dashboard/lib/compute.js`
- Test: `youtube-dashboard/lib/compute.test.mjs`

**Interfaces:**
- Consumes: `db()` (supabase.js); env `YOUTUBE_CHANNEL_ID`.
- Produces: `lib/compute.js` 의 `fmt(n)->string`, `delta(today, prev)->number|null`, `risingVideos(latestRows, prevRows, limit)->[{...video, viewDelta}]`. 페이지 `/` 는 최근 두 `daily_snapshots` + 최신/직전 `video_snapshots` 를 읽어 카드로 렌더링.

- [ ] **Step 1: compute 단위 테스트 작성 (실패 먼저)**

Create `youtube-dashboard/lib/compute.test.mjs`:

```js
import assert from 'node:assert';
import { fmt, delta, risingVideos } from './compute.js';

assert.equal(fmt(13100), '13,100');
assert.equal(fmt(null), '0');
assert.equal(delta(13100, 13050), 50);
assert.equal(delta(13100, null), null);

const latest = [
  { video_id: 'a', title: 'A', views: 1000, published_at: '2026-06-20', thumbnail: '' },
  { video_id: 'b', title: 'B', views: 500, published_at: '2026-06-19', thumbnail: '' },
];
const prev = [
  { video_id: 'a', views: 700 },
  { video_id: 'b', views: 480 },
];
const rising = risingVideos(latest, prev, 2);
assert.equal(rising[0].video_id, 'a', '증가폭 큰 영상이 먼저');
assert.equal(rising[0].viewDelta, 300);
assert.equal(rising[1].viewDelta, 20);
console.log('compute OK');
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `cd youtube-dashboard && node lib/compute.test.mjs`
Expected: FAIL — `Cannot find module './compute.js'` 또는 함수 없음.

- [ ] **Step 3: compute.js 구현**

Create `youtube-dashboard/lib/compute.js`:

```js
export function fmt(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

export function delta(today, prev) {
  if (prev === null || prev === undefined) return null;
  return Number(today || 0) - Number(prev || 0);
}

// latestRows: 최신 날짜 video_snapshots, prevRows: 직전 날짜 video_snapshots
export function risingVideos(latestRows, prevRows, limit = 5) {
  const prevMap = new Map((prevRows || []).map((r) => [r.video_id, Number(r.views || 0)]));
  return (latestRows || [])
    .map((v) => ({ ...v, viewDelta: Number(v.views || 0) - (prevMap.get(v.video_id) ?? Number(v.views || 0)) }))
    .filter((v) => v.viewDelta > 0)
    .sort((a, b) => b.viewDelta - a.viewDelta)
    .slice(0, limit);
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `cd youtube-dashboard && node lib/compute.test.mjs`
Expected: `compute OK`, 종료코드 0.

- [ ] **Step 5: globals.css 작성**

Create `youtube-dashboard/app/globals.css`:

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif;
  background: #f7f7f5;
  color: #1c1c1a;
}
.wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px 64px; }
.title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.sub { color: #6b6b66; font-size: 14px; margin: 0 0 24px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid #ececea; border-radius: 14px; padding: 18px 20px; }
.card .label { font-size: 13px; color: #8a8a85; margin-bottom: 6px; }
.card .big { font-size: 28px; font-weight: 700; }
.up { color: #1a7f4b; font-size: 13px; margin-top: 6px; }
.down { color: #b4452f; font-size: 13px; margin-top: 6px; }
.flat { color: #8a8a85; font-size: 13px; margin-top: 6px; }
.section { margin-top: 36px; }
.section h2 { font-size: 16px; margin: 0 0 12px; }
.vid { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0ee; }
.vid img { width: 120px; height: 68px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.vid .vtitle { font-size: 14px; font-weight: 600; line-height: 1.35; }
.vid .vmeta { font-size: 12px; color: #8a8a85; margin-top: 4px; }
.empty { background: #fff; border: 1px dashed #d8d8d4; border-radius: 14px; padding: 40px 20px; text-align: center; color: #6b6b66; }
.foot { margin-top: 40px; font-size: 12px; color: #aaa; }
```

- [ ] **Step 6: layout.js 작성**

Create `youtube-dashboard/app/layout.js`:

```js
import './globals.css';

export const metadata = {
  title: '유튜브 채널 리포트',
  description: '태오의 실행 비즈니스 — 매일 아침 8시 자동 갱신',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: page.js 작성**

Create `youtube-dashboard/app/page.js`:

```js
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
    daily = d.data || [];

    if (daily.length) {
      const latestDate = daily[0].captured_date;
      const lv = await client
        .from('video_snapshots')
        .select('*')
        .eq('channel_id', CHANNEL_ID)
        .eq('captured_date', latestDate)
        .order('published_at', { ascending: false });
      latestVideos = lv.data || [];
      if (daily[1]) {
        const pv = await client
          .from('video_snapshots')
          .select('video_id, views')
          .eq('channel_id', CHANNEL_ID)
          .eq('captured_date', daily[1].captured_date);
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
      <h1 className="title">{today ? today.title : '유튜브 채널 리포트'}</h1>
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
                  {v.thumbnail ? <img src={v.thumbnail} alt="" /> : null}
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
                {v.thumbnail ? <img src={v.thumbnail} alt="" /> : null}
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
```

- [ ] **Step 8: 페이지 파일 존재 확인**

Run: `ls youtube-dashboard/app/page.js youtube-dashboard/app/layout.js youtube-dashboard/lib/compute.js`
Expected: 세 경로 모두 출력.

---

### Task 5: Vercel 배포 + 환경변수 + Cron

**Files:**
- Use: `youtube-dashboard/vercel.json` (이미 존재: cron `0 23 * * *`)
- Create (로컬 검증용): `youtube-dashboard/.env.local` (배포엔 안 올라감 — `.gitignore`)

**Interfaces:**
- Consumes: Supabase project URL + publishable key (MCP), 루트 `.env` 의 `YOUTUBE_API_KEY`.
- Produces: 배포된 Vercel 앱 URL, 5개 환경변수 설정됨, cron 등록됨.

- [ ] **Step 1: 의존성 설치 + 로컬 빌드 검증**

Run: `cd youtube-dashboard && npm install && npm run build`
Expected: 빌드 성공(`Compiled successfully`). 실패 시 import 경로/문법 수정 후 재실행.

- [ ] **Step 2: Supabase 접속 정보 취득**

MCP `get_project_url`(project_id `ptluntkhhszuircqztjr`) → `SUPABASE_URL`.
MCP `get_publishable_keys`(project_id `ptluntkhhszuircqztjr`) → `SUPABASE_KEY` 로 쓸 publishable key.
(서버 전용 env 라 브라우저 노출 없음. RLS 비활성 테이블이라 read/write 가능.)

- [ ] **Step 3: CRON_SECRET 생성**

임의 문자열 1개 생성(예: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`). 이 값을 `CRON_SECRET` 로 쓴다.

- [ ] **Step 4: 환경변수 5개를 Vercel 프로젝트에 설정 + 배포**

`youtube-dashboard/` 안에서 Vercel에 배포한다. 환경변수: `YOUTUBE_API_KEY`(루트 .env 값), `YOUTUBE_CHANNEL_ID`=`UCoiqKDFftEDHBfc_X8rteFg`, `SUPABASE_URL`, `SUPABASE_KEY`, `CRON_SECRET`. (CLI `vercel env add` 또는 Vercel MCP 사용. **반드시 youtube-dashboard 폴더만** 배포 — 상위 사업 폴더 금지.)
Run: `cd youtube-dashboard && vercel --prod` (env 설정 후)
Expected: Production URL 반환.

- [ ] **Step 5: 빌드 로그에 cron 등록 확인**

배포 후 Vercel 대시보드/MCP로 cron `/api/cron/collect @ 0 23 * * *` 등록 확인.

---

### Task 6: 첫 수집 실행 + 검증

**Interfaces:**
- Consumes: 배포 URL, `CRON_SECRET`.

- [ ] **Step 1: 수집 라우트 수동 1회 호출**

Run: `curl -s -H "Authorization: Bearer <CRON_SECRET>" https://<배포URL>/api/cron/collect`
Expected: `{"ok":true,"date":"2026-06-21","subscribers":131xx,"videos":25}` 형태.

- [ ] **Step 2: Supabase 행 생성 확인**

MCP `execute_sql`(project_id `ptluntkhhszuircqztjr`): `select captured_date, subscribers, total_views, total_videos from public.daily_snapshots order by captured_date desc limit 3;`
Expected: 오늘 날짜 1행, subscribers 13000대.

- [ ] **Step 3: 대시보드 화면 확인**

배포 URL 을 브라우저(또는 Playwright)로 열어 카드 3개(구독자·누적조회수·영상수)와 "최근 올라온 영상" 목록이 보이는지 확인. (첫날은 "어제 기록 없음" 표시가 정상 — 증감은 둘째 날부터.)
Expected: 채널 제목 + 수치 카드 + 영상 목록 렌더링.

- [ ] **Step 4: 이어가기.md 갱신**

루트 `이어가기.md` 에 유튜브 대시보드 배포 URL·구조·갱신법(매일 08:00 KST 자동, 수동수집 curl 명령)을 한 단락 추가.

---

## Self-Review 결과

- **Spec coverage:** ① 구독자 변화 → Task 4 카드+DeltaLine ✅ ② 새 영상+조회수 → Task 4 "최근 올라온 영상" ✅ ③ 채널 누적 수치 → Task 4 카드 3개 ✅ ④ 인기 급상승 → Task 4 risingVideos ✅ / 매일 8시 자동 → Task 1 테이블 + Task 3 수집 + Task 5 cron ✅ / 웹 대시보드 → Task 4 + Task 5 배포 ✅.
- **Placeholder scan:** 모든 코드 블록 실제 내용. "적절히 처리" 류 없음 ✅.
- **Type consistency:** `fetchChannel`/`fetchRecentVideos`/`kstDate`(youtube.js), `db()`(supabase.js), `fmt`/`delta`/`risingVideos`(compute.js), 컬럼명(channel_id, captured_date, subscribers, total_views, total_videos, video_id, views, likes, published_at, thumbnail)이 Task 1·3·4 전반에서 일치 ✅.
- **주의:** 이 환경은 git 저장소가 아니므로 plan 템플릿의 commit 단계는 "파일 저장 확인"으로 대체. 외부 API/배포 의존 태스크는 TDD 대신 라이브 스모크/배포 후 검증으로 적응.
