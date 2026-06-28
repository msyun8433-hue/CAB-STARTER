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
// 신규 영상(prev 없음)은 급상승에서 제외된다
const withNew = [
  { video_id: 'a', title: 'A', views: 1000 },
  { video_id: 'new', title: 'NEW', views: 99999 },
];
const prevOnlyA = [{ video_id: 'a', views: 700 }];
const r2 = risingVideos(withNew, prevOnlyA, 5);
assert.equal(r2.length, 1, '신규 영상은 제외되어 1개만');
assert.equal(r2[0].video_id, 'a', '어제 기준 있는 a 만 급상승');
console.log('compute OK');
