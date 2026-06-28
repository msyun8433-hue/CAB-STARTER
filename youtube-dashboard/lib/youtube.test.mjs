import assert from 'node:assert';
import { kstDate } from './youtube.js';

// 2026-06-21T20:00:00Z 는 KST 로 2026-06-22 05:00 → 날짜 2026-06-22
assert.equal(kstDate(new Date('2026-06-21T20:00:00Z')), '2026-06-22', 'UTC 저녁→KST 다음날');
// 2026-06-21T10:00:00Z 는 KST 19:00 → 2026-06-21
assert.equal(kstDate(new Date('2026-06-21T10:00:00Z')), '2026-06-21', 'UTC 낮→KST 같은날');
console.log('kstDate OK');
