/**
 * Tests for session.html frontend functions
 * Tests: collectFormData, escapeHtml, displayMirror, localStorage integration
 */

const {
  escapeHtml,
  collectFormData,
  displayMirror,
  submitAndShowMirror
} = require('./mirror-functions.js');

describe('session.html frontend functions', () => {
  let form, mockFormData;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <form id="form">
        <input type="text" name="3_감각체크" value="">
        <input type="text" name="3_한단어" placeholder="한 단어">
        <textarea name="4_장면" placeholder="장면"></textarea>
        <textarea name="4_감각" placeholder="감각"></textarea>
        <textarea name="4_말" placeholder="말"></textarea>
        <textarea name="5_목소리A" placeholder="목소리A"></textarea>
        <textarea name="5_목소리B" placeholder="목소리B"></textarea>
        <textarea name="6_한문장" placeholder="한문장"></textarea>
        <input type="text" name="6_느낌" placeholder="느낌">
        <input type="text" name="7_내일행동" placeholder="내일행동">
        <input type="text" name="감사1" value="">
        <input type="text" name="감사2" value="">
        <input type="text" name="감사3" value="">
        <button type="submit" class="btn primary">보내기</button>
      </form>
      <div id="mirror-section" style="display:none;"></div>
    `;

    form = document.getElementById('form');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      // This function should be defined in session.html
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      // This test will fail until escapeHtml is implemented
      expect(escapeHtml(input)).toBe(expected);
    });

    test('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('does not escape safe content', () => {
      const input = 'Hello World!';
      expect(escapeHtml(input)).toBe('Hello World!');
    });

    test('escapes single and double quotes', () => {
      const input = "It's a \"quote\"";
      expect(escapeHtml(input)).toContain('&#039;');
      expect(escapeHtml(input)).toContain('&quot;');
    });

    test('escapes ampersands', () => {
      const input = 'Tom & Jerry';
      expect(escapeHtml(input)).toBe('Tom &amp; Jerry');
    });
  });

  describe('collectFormData', () => {
    test('collects all form data and returns structured object', () => {
      // Set form values
      form.elements['3_감각체크'].value = '무거움, 긴장';
      form.elements['3_한단어'].value = '피로';
      form.elements['4_장면'].value = '회의실에서';
      form.elements['4_감각'].value = '목이 뻣뻣';
      form.elements['4_말'].value = '너는 충분해';
      form.elements['5_목소리A'].value = '왜 못했지';
      form.elements['5_목소리B'].value = '하지만 넌 했어';
      form.elements['6_한문장'].value = '오늘은 열심히 살았다';
      form.elements['6_느낌'].value = '뿌듯함';
      form.elements['7_내일행동'].value = '산책하기';
      form.elements['감사1'].value = '햇살';
      form.elements['감사2'].value = '숨';
      form.elements['감사3'].value = '';

      const result = collectFormData();

      expect(result).toHaveProperty('sensations', '무거움, 긴장');
      expect(result).toHaveProperty('oneWord', '피로');
      expect(result).toHaveProperty('scene', '회의실에서');
      expect(result).toHaveProperty('sceneSensation', '목이 뻣뻣');
      expect(result).toHaveProperty('sceneInterpretation', '너는 충분해');
      expect(result).toHaveProperty('voiceA', '왜 못했지');
      expect(result).toHaveProperty('voiceB', '하지만 넌 했어');
      expect(result).toHaveProperty('oneSentence', '오늘은 열심히 살았다');
      expect(result).toHaveProperty('sentenceFeeling', '뿌듯함');
      expect(result).toHaveProperty('tomorrowAction', '산책하기');
      expect(result).toHaveProperty('gratitude');
    });

    test('gratitude array includes only non-empty values', () => {
      form.elements['감사1'].value = '햇살';
      form.elements['감사2'].value = '';
      form.elements['감사3'].value = '숨';

      const result = collectFormData();

      expect(Array.isArray(result.gratitude)).toBe(true);
      expect(result.gratitude).toEqual(['햇살', '숨']);
    });

    test('generates unique userId for each session', () => {
      const result1 = collectFormData();
      const result2 = collectFormData();

      expect(result1).toHaveProperty('userId');
      expect(result2).toHaveProperty('userId');
      // userId should be consistent within same form instance but can be random
      expect(typeof result1.userId).toBe('string');
    });

    test('handles empty form gracefully', () => {
      const result = collectFormData();

      expect(result).toHaveProperty('sensations');
      expect(result).toHaveProperty('gratitude');
      expect(Array.isArray(result.gratitude)).toBe(true);
    });
  });

  describe('displayMirror', () => {
    test('displays mirror text in designated section', () => {
      const mirrorText = 'This is the mirror text';
      const mirrorId = 'mirror-123';
      const sessionId = 'session-456';

      displayMirror(mirrorText, mirrorId, sessionId);

      const mirrorSection = document.getElementById('mirror-section');
      expect(mirrorSection.style.display).not.toBe('none');
      expect(mirrorSection.textContent).toContain(mirrorText);
    });

    test('hides form when mirror is displayed', () => {
      displayMirror('Mirror text', 'mirror-123', 'session-456');

      expect(form.style.display).toBe('none');
    });

    test('escapes HTML in mirror text for safety', () => {
      const mirrorText = '<script>alert("xss")</script>';
      displayMirror(mirrorText, 'mirror-123', 'session-456');

      const mirrorSection = document.getElementById('mirror-section');
      expect(mirrorSection.innerHTML).not.toContain('<script>');
    });

    test('shows "다시 기록하기" link', () => {
      displayMirror('Mirror text', 'mirror-123', 'session-456');

      const mirrorSection = document.getElementById('mirror-section');
      const link = mirrorSection.querySelector('a');
      expect(link).not.toBeNull();
      expect(link.textContent).toContain('다시 기록하기');
    });

    test('saves mirror to localStorage with session ID key', () => {
      const mirrorText = 'Mirror content';
      const mirrorId = 'mirror-123';
      const sessionId = 'session-456';

      displayMirror(mirrorText, mirrorId, sessionId);

      const saved = localStorage.getItem(`mirror_${sessionId}`);
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved)).toHaveProperty('mirrorText', mirrorText);
      expect(JSON.parse(saved)).toHaveProperty('mirrorId', mirrorId);
    });
  });

  describe('submitAndShowMirror', () => {
    test('calls /api/mirror with form data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          mirrorText: 'Generated mirror',
          mirrorId: 'mirror-123',
          sessionId: 'session-456',
        }),
      });

      form.elements['3_감각체크'].value = '무거움';
      form.elements['3_한단어'].value = '피로';
      form.elements['4_장면'].value = '장면';
      form.elements['4_감각'].value = '감각';
      form.elements['4_말'].value = '말';
      form.elements['5_목소리A'].value = 'A';
      form.elements['5_목소리B'].value = 'B';
      form.elements['6_한문장'].value = '문장';
      form.elements['6_느낌'].value = '느낌';
      form.elements['7_내일행동'].value = '행동';

      await submitAndShowMirror();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/mirror',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    test('displays mirror on successful response', async () => {
      const mockMirrorText = 'Generated mirror text';
      const mockMirrorId = 'mirror-123';
      const mockSessionId = 'session-456';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          mirrorText: mockMirrorText,
          mirrorId: mockMirrorId,
          sessionId: mockSessionId,
        }),
      });

      form.elements['3_감각체크'].value = 'test';
      form.elements['4_장면'].value = 'test';
      form.elements['4_감각'].value = 'test';
      form.elements['4_말'].value = 'test';
      form.elements['5_목소리A'].value = 'test';
      form.elements['5_목소리B'].value = 'test';
      form.elements['6_한문장'].value = 'test';

      await submitAndShowMirror();

      expect(document.getElementById('mirror-section').textContent).toContain(
        mockMirrorText
      );
    });

    test('shows error alert on API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'API error',
        }),
      });

      global.alert = jest.fn();

      form.elements['3_감각체크'].value = 'test';
      form.elements['4_장면'].value = 'test';
      form.elements['4_감각'].value = 'test';
      form.elements['4_말'].value = 'test';
      form.elements['5_목소리A'].value = 'test';
      form.elements['5_목소리B'].value = 'test';
      form.elements['6_한문장'].value = 'test';

      await submitAndShowMirror();

      expect(global.alert).toHaveBeenCalled();
    });

    test('shows error alert on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.alert = jest.fn();

      form.elements['3_감각체크'].value = 'test';
      form.elements['4_장면'].value = 'test';
      form.elements['4_감각'].value = 'test';
      form.elements['4_말'].value = 'test';
      form.elements['5_목소리A'].value = 'test';
      form.elements['5_목소리B'].value = 'test';
      form.elements['6_한문장'].value = 'test';

      await submitAndShowMirror();

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('요청')
      );
    });
  });

  describe('form submission event listener', () => {
    test('submitAndShowMirror calls fetch with correct endpoint', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          mirrorText: 'Mirror',
          mirrorId: 'id',
          sessionId: 'sid',
        }),
      });

      // Fill minimal required fields
      form.elements['3_감각체크'].value = 'test';
      form.elements['4_장면'].value = 'test';
      form.elements['4_감각'].value = 'test';
      form.elements['4_말'].value = 'test';
      form.elements['5_목소리A'].value = 'test';
      form.elements['5_목소리B'].value = 'test';
      form.elements['6_한문장'].value = 'test';

      await submitAndShowMirror(form);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/mirror',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
