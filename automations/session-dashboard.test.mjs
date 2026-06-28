import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, classifyOutputs } from './session-dashboard.mjs';
import { daysSince, findStalled, decideNextStep } from './session-dashboard.mjs';

test('normalizeName: 공백·기호·대소문자 제거', () => {
  assert.equal(normalizeName('하루 끝, 나에게_v0.4'), '하루끝나에게v04');
  assert.equal(normalizeName('A B-C'), 'abc');
});

test('classifyOutputs: m4a 짝 있으면 녹음, 없으면 초안', () => {
  const files = [
    '오디오대본_하루끝-나에게_v0.4.md',
    '오디오대본_하루끝-나에게_v0.4.m4a',  // 정확히 같은 이름의 짝 → 녹음
    '세션_텅빈저녁_v0.1.md',              // 짝 m4a 없음 → 초안
  ];
  const r = classifyOutputs(files);
  assert.deepEqual(r.녹음, ['오디오대본_하루끝-나에게_v0.4']);
  assert.deepEqual(r.초안, ['세션_텅빈저녁_v0.1']);
});

// 회귀 방지: 실제 outputs 파일명 패턴으로 분류 검증
test('classifyOutputs: 실제 파일명 패턴 — v0.1 버그 수정 확인', () => {
  const files = [
    // 대본
    '오디오대본_하루끝-나에게_v0.4.md',
    '오디오대본_하루끝-나에게_v0.1.md',
    '세션_텅빈저녁_v0.1.md',
    // m4a (이름 표기가 다양함)
    '오디오대본_하루끝-나에게_v0.4.m4a',
    '오디오 대본_하루 끝, 나에게_v0.4.m4a',
    '오디오대본_하루끝-나에게_v0.1.m4a',
    '오디오_하루끝_v0.4_3초컷.m4a',       // 3초컷 편집본 — 대본 짝이 아님
  ];
  const r = classifyOutputs(files);
  assert.ok(r.녹음.includes('오디오대본_하루끝-나에게_v0.4'), 'v0.4 녹음이어야 함');
  assert.ok(r.녹음.includes('오디오대본_하루끝-나에게_v0.1'), 'v0.1 녹음이어야 함 (버그 수정)');
  assert.ok(r.초안.includes('세션_텅빈저녁_v0.1'), '짝 없으면 초안');
  assert.ok(!r.초안.includes('오디오대본_하루끝-나에게_v0.1'), 'v0.1이 초안에 없어야 함');
});

test('classifyOutputs: 대본 아닌 .md 는 무시', () => {
  const r = classifyOutputs(['받아쓰기_첫세션_v0.1.txt', '워크북_v0.1.html']);
  assert.deepEqual(r.초안, []);
  assert.deepEqual(r.녹음, []);
});

test('daysSince: 하루=1, 같은 날=0', () => {
  const day = 86400000;
  assert.equal(daysSince(1000 * 0, day * 3 + 5000), 3);
  assert.equal(daysSince(day * 2, day * 2 + 100), 0);
});

test('findStalled: 7일 이상만, 오래된 순', () => {
  const items = [{ name: 'a', days: 9 }, { name: 'b', days: 2 }, { name: 'c', days: 7 }];
  assert.deepEqual(findStalled(items), [{ name: 'a', days: 9 }, { name: 'c', days: 7 }]);
});

test('decideNextStep: 세션 초안 우선 → 재료 → 없음', () => {
  assert.match(decideNextStep({ 초안: ['세션_텅빈저녁_v0.1'], 재료: [] }), /녹음/);
  assert.match(decideNextStep({ 초안: [], 재료: ['x', 'y'] }), /질문지|대본/);
  assert.match(decideNextStep({ 초안: [], 재료: [] }), /상태/);
});

import { renderHtml } from './session-dashboard.mjs';

test('renderHtml: 오늘 칸·추천·진도·병목 표시 + 금지어 없음', () => {
  const html = renderHtml({
    오늘한일: ['김경일_이질문'],
    추천: ['"텅빈저녁"이 5일째 대본에서 멈췄어요. 녹음 추천.', '한 단계에 일이 쌓였어요(병목: 녹음).'],
    진도: [
      { name: '하루끝-나에게_v0.4', stage: { label: '발행', step: 7 }, days: 2, stalled: false },
      { name: '텅빈저녁_v0.1', stage: { label: '대본', step: 4 }, days: 5, stalled: false },
    ],
    병목: { counts: { 재료: 2, 대본: 6, 녹음: 2, 발행: 1 }, rate: 9, 쌓인단계: '녹음' },
    다음걸음: '다음 걸음 문구',
    잠든: [], 재료: [], 초안: [], 녹음: [], stamp: '2026-06-21',
  });
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /오늘/);
  assert.match(html, /김경일_이질문/);
  assert.match(html, /텅빈저녁/);
  assert.match(html, /병목/);
  assert.match(html, /<details/);                 // 표·점검 접힘
  // 숫자요약 4칸: 재료·대본·녹음·발행 라벨이 모두 있어야 함
  assert.match(html, /class="k">재료<\/div>/);
  assert.match(html, /class="k">대본<\/div>/);
  assert.match(html, /class="k">녹음<\/div>/);
  assert.match(html, /class="k">발행<\/div>/);
  // 병목.counts 값이 그대로 표시됨
  assert.match(html, /class="n">2<\/div>[\s\S]*?class="k">재료/);
  assert.match(html, /class="n">6<\/div>[\s\S]*?class="k">대본/);
  assert.match(html, /class="n">1<\/div>[\s\S]*?class="k">발행/);
  for (const 금지어 of ['치유', '회복', '성장', '변화', '코칭', '명상', '소마틱', '이완']) {
    assert.ok(!html.includes(금지어), `금지어 발견: ${금지어}`);
  }
});

import { parsePublished, stageOf } from './session-dashboard.mjs';

test('parsePublished: 글머리·제목·빈줄 무시하고 정규화 키 집합', () => {
  const s = parsePublished('# 발행 목록\n- 오디오대본_하루끝-나에게_v0.4\n\n* 세션_텅빈저녁_v0.1\n');
  assert.ok(s.has(normalizeName('오디오대본_하루끝-나에게_v0.4')));
  assert.ok(s.has(normalizeName('세션_텅빈저녁_v0.1')));
  assert.equal(s.has(normalizeName('발행 목록')), false);
});

test('stageOf: 발행>녹음>재료>대본 우선순위', () => {
  const pub = new Set([normalizeName('하루끝-나에게_v0.4')]);
  assert.deepEqual(stageOf('하루끝-나에게_v0.4', pub, true, false), { label: '발행', step: 7 });
  assert.deepEqual(stageOf('멍한주말_v0.1', new Set(), true, false), { label: '녹음', step: 6 });
  assert.deepEqual(stageOf('김경일_이질문', new Set(), false, true), { label: '재료', step: 2 });
  assert.deepEqual(stageOf('텅빈저녁_v0.1', new Set(), false, false), { label: '대본', step: 4 });
});

import { collectToday, bottleneck, decideAdvice, kstDate } from './session-dashboard.mjs';

test('collectToday: isToday true 만', () => {
  assert.deepEqual(
    collectToday([{ name: 'a', isToday: true }, { name: 'b', isToday: false }, { name: 'c', isToday: true }]),
    ['a', 'c']);
});

test('kstDate: 한국시간 날짜 문자열(YYYY-MM-DD)', () => {
  // 2026-06-21 00:00 KST = 2026-06-20 15:00 UTC
  assert.equal(kstDate(Date.UTC(2026, 5, 20, 15, 0, 0)), '2026-06-21');
  // 2026-06-20 14:59 UTC = 2026-06-20 23:59 KST → 아직 20일
  assert.equal(kstDate(Date.UTC(2026, 5, 20, 5, 0, 0)), '2026-06-20');
});

test('bottleneck: 진행률과 쌓인 단계', () => {
  const r = bottleneck({ 재료: 2, 대본: 6, 녹음: 2, 발행: 2 });
  assert.equal(r.total, 12);
  assert.equal(r.rate, 17);                 // 2/12 = 16.6 → 17
  assert.equal(r.쌓인단계, '녹음');          // 대본6 ≥ 녹음2*2 → 다음 단계 '녹음'
});

test('bottleneck: 병목 없으면 null', () => {
  assert.equal(bottleneck({ 재료: 1, 대본: 1, 녹음: 1, 발행: 1 }).쌓인단계, null);
});

test('decideAdvice: 늦은 것 + 병목 두 줄', () => {
  const lines = decideAdvice({
    늦은: { name: '텅빈저녁', days: 5, label: '대본' },
    쌓인단계: '녹음', fallback: '다음 걸음',
  });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /텅빈저녁/);
  assert.match(lines[0], /녹음/);            // 대본 → 다음행동 '녹음'
  assert.match(lines[1], /병목/);
});

test('decideAdvice: 둘 다 없으면 fallback 한 줄', () => {
  assert.deepEqual(decideAdvice({ 늦은: null, 쌓인단계: null, fallback: '다음 걸음' }), ['다음 걸음']);
});
