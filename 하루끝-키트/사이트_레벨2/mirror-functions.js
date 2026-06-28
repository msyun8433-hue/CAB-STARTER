/**
 * Mirror Feature Functions (Task 3)
 * Handles collecting form data, calling API, and displaying mirror text
 *
 * Functions:
 * - escapeHtml(text): Escapes HTML special characters
 * - collectFormData(): Collects form data into structured object for API
 * - displayMirror(mirrorText, mirrorId, sessionId): Displays mirror and hides form
 * - submitAndShowMirror(): Calls /api/mirror and handles response
 */

/**
 * escapeHtml - Escapes HTML special characters for safe display
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for HTML display
 */
function escapeHtml(text) {
  if (!text) return '';
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(c) { return map[c]; });
}

/**
 * collectFormData - Collects all form data into structured object
 * Maps form field names to API field names expected by /api/mirror endpoint
 * @param {HTMLFormElement} [formElement] - Optional form element (defaults to #form)
 * @returns {object} - Form data with userId, sensations, oneWord, scene, etc.
 */
function collectFormData(formElement) {
  var form = formElement || document.getElementById('form');
  if (!form) throw new Error('Form element not found');

  var formData = new FormData(form);
  var data = {};
  formData.forEach(function(v, k) { data[k] = v; });

  // Generate a unique userId for this session (can be enhanced later)
  var userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    try {
      localStorage.setItem('userId', userId);
    } catch (e) {
      // localStorage not available, use temp ID
      userId = 'user_' + Date.now();
    }
  }

  // Collect gratitude array, filtering out empty values
  var gratitude = [];
  ['감사1', '감사2', '감사3'].forEach(function(key) {
    var val = data[key] ? data[key].trim() : '';
    if (val) gratitude.push(val);
  });

  // Return structured object matching API expectations
  return {
    userId: userId,
    sensations: data['3_감각체크'] || '',
    oneWord: data['3_한단어'] || '',
    scene: data['4_장면'] || '',
    sceneSensation: data['4_감각'] || '',
    sceneInterpretation: data['4_말'] || '',
    voiceA: data['5_목소리A'] || '',
    voiceB: data['5_목소리B'] || '',
    oneSentence: data['6_한문장'] || '',
    sentenceFeeling: data['6_느낌'] || '',
    tomorrowAction: data['7_내일행동'] || '',
    gratitude: gratitude
  };
}

/**
 * displayMirror - Displays generated mirror text and hides form
 * Saves mirror to localStorage and shows "다시 기록하기" link
 * @param {string} mirrorText - Generated mirror text from API
 * @param {string} mirrorId - Mirror ID from API
 * @param {string} sessionId - Session ID from API
 */
function displayMirror(mirrorText, mirrorId, sessionId) {
  var form = document.getElementById('form');
  if (!form) throw new Error('Form element not found');

  // Save to localStorage for timeline/persistence
  var mirrorRecord = {
    mirrorText: mirrorText,
    mirrorId: mirrorId,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  };
  try {
    localStorage.setItem('mirror_' + sessionId, JSON.stringify(mirrorRecord));
  } catch (e) {
    console.warn('localStorage not available');
  }

  // Hide form
  form.style.display = 'none';

  // Create and display mirror section
  var mirrorSection = document.getElementById('mirror-section');
  if (!mirrorSection) {
    mirrorSection = document.createElement('section');
    mirrorSection.id = 'mirror-section';
    mirrorSection.style.paddingTop = '32px';
    mirrorSection.style.borderTop = '1px solid var(--line)';
    form.parentNode.insertBefore(mirrorSection, form.nextSibling);
  }

  // Escaped mirror text (safe from XSS)
  var escaped = escapeHtml(mirrorText);

  // Build HTML with pre-wrap to preserve whitespace
  mirrorSection.innerHTML = `
    <div style="background:var(--card); border:1px solid var(--line); border-radius:14px; padding:24px; margin:0 0 24px; line-height:1.9; white-space:pre-wrap; word-wrap:break-word; color:var(--ink); font-size:16px;">
      ${escaped}
    </div>
    <div style="text-align:center;">
      <a href="#" onclick="location.reload(); return false;" style="color:var(--accent); text-decoration:none; font-weight:600;">다시 기록하기</a>
    </div>
  `;

  mirrorSection.style.display = 'block';
  // scrollIntoView may not be available in test environment
  if (typeof mirrorSection.scrollIntoView === 'function') {
    mirrorSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * submitAndShowMirror - Calls /api/mirror endpoint and displays result
 * Handles success and error cases with user-friendly messages
 * @param {HTMLFormElement} [formElement] - Optional form element (defaults to #form)
 * @returns {Promise<void>}
 */
async function submitAndShowMirror(formElement) {
  try {
    var form = formElement || document.getElementById('form');
    if (!form) throw new Error('Form element not found');

    // Collect form data
    var formData = collectFormData(form);

    // Send to API
    var response = await fetch('/api/mirror', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    // Check for HTTP errors before parsing JSON
    if (!response.ok) {
      throw new Error('서버 오류: ' + response.status);
    }

    var result = await response.json();

    if (result.success) {
      // Display mirror
      displayMirror(result.mirrorText, result.mirrorId, result.sessionId);
    } else {
      // Show error message from API
      alert('요청 처리 중 오류가 발생했습니다.\n' + (result.error || ''));
    }
  } catch (error) {
    // Network or other errors
    alert('요청 중 오류가 발생했습니다.\n' + error.message);
  }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    collectFormData,
    displayMirror,
    submitAndShowMirror
  };
}
