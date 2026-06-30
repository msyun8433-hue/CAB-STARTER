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
 * switchTab - Switch between write and mirror tabs
 * @param {string} tabName - 'write' or 'mirror'
 */
function switchTab(tabName) {
  // Hide all tab contents
  var contents = document.querySelectorAll('.tab-content');
  contents.forEach(function(c) { c.classList.remove('active'); });

  // Remove active from all buttons
  var buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(function(b) { b.classList.remove('active'); });

  // Show selected tab
  var tabId = tabName + '-tab';
  var tab = document.getElementById(tabId);
  if (tab) {
    tab.classList.add('active');
  }

  // Activate button
  var activeBtn = document.querySelector('.tab-btn[onclick="switchTab(\'' + tabName + '\')"]');
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // If mirror tab, load mirrors from localStorage
  if (tabName === 'mirror') {
    loadMirrorsFromStorage();
  }
}

/**
 * loadMirrorsFromStorage - Load and display saved mirrors from localStorage
 */
function loadMirrorsFromStorage() {
  var mirrorsList = document.getElementById('mirrors-list');
  if (!mirrorsList) return;

  var mirrors = [];
  for (var key in localStorage) {
    if (key.startsWith('mirror_')) {
      try {
        var data = JSON.parse(localStorage[key]);
        mirrors.push(data);
      } catch (e) {
        console.warn('Failed to parse mirror:', key);
      }
    }
  }

  if (mirrors.length === 0) {
    mirrorsList.innerHTML = '<div style="padding:40px; text-align:center; color:var(--muted);">아직 거울 글이 없습니다.</div>';
    return;
  }

  // Sort by timestamp (newest first)
  mirrors.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  var html = mirrors.map(function(mirror, idx) {
    var date = new Date(mirror.timestamp);
    var dateStr = date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
    var preview = mirror.mirrorText.substring(0, 120) + (mirror.mirrorText.length > 120 ? '...' : '');

    return `<div style="background:var(--card); border:1px solid var(--line); border-radius:10px; padding:18px; margin-bottom:12px; cursor:pointer;" onclick="expandMirror(${idx})">
      <div style="color:var(--muted); font-size:13px; margin-bottom:8px;">${dateStr}</div>
      <div style="color:var(--soft); line-height:1.6;">${escapeHtml(preview)}</div>
    </div>`;
  }).join('');

  mirrorsList.innerHTML = html;
}

/**
 * expandMirror - Show full mirror text
 */
function expandMirror(idx) {
  var mirrors = [];
  for (var key in localStorage) {
    if (key.startsWith('mirror_')) {
      try {
        mirrors.push(JSON.parse(localStorage[key]));
      } catch (e) {}
    }
  }
  mirrors.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  if (idx >= 0 && idx < mirrors.length) {
    var mirror = mirrors[idx];
    var html = `<div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999;" onclick="if(event.target===this)closeExpand()">
      <div style="background:white; border-radius:12px; padding:30px; max-width:600px; max-height:80vh; overflow-y:auto;">
        <button onclick="closeExpand()" style="float:right; background:none; border:none; font-size:24px; cursor:pointer; color:#ccc;">×</button>
        <h3 style="margin:0 0 16px;">${new Date(mirror.timestamp).toLocaleDateString('ko-KR')}</h3>
        <div style="white-space:pre-wrap; line-height:1.8; font-size:15px;">${escapeHtml(mirror.mirrorText)}</div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }
}

/**
 * closeExpand - Close expanded mirror view
 */
function closeExpand() {
  var modal = document.querySelector('[onclick*="closeExpand"]').parentElement.parentElement;
  modal.remove();
}

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
    userName: data['이름'] ? data['이름'].trim() : '',
    userContact: data['연락처'] ? data['연락처'].trim() : '',
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

  // Clear the saved draft so the next visit starts with a fresh, empty form.
  // The same customer uses this tool repeatedly — once a record is sent, the
  // old answers must not linger and pre-fill the next session.
  // ('haruEnd_기본_v1' is the autosave key set in session.html.)
  try {
    localStorage.removeItem('haruEnd_기본_v1');
  } catch (e) {
    // localStorage unavailable — nothing to clear
  }
  form.reset();

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
// Guard flag: blocks repeat submissions while one is in flight, so impatient
// double/triple clicks can't create duplicate mirrors.
var isSubmitting = false;

async function submitAndShowMirror(formElement) {
  // Already sending — ignore extra clicks
  if (isSubmitting) return;

  var sendBtn = document.getElementById('sendBtn');
  var originalText = sendBtn ? sendBtn.textContent : '';

  try {
    var form = formElement || document.getElementById('form');
    if (!form) throw new Error('Form element not found');

    // Collect form data
    var formData = collectFormData(form);

    // Lock the button and show progress so the user knows it's working
    isSubmitting = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
      sendBtn.style.cursor = 'wait';
      sendBtn.textContent = '거울을 비추는 중…';
    }

    // Send to API
    var response = await fetch('/api/mirror', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    // Read the JSON body even on HTTP errors — the server sends a gentle,
    // user-friendly message (e.g. "잠시 붐비고 있어요") that we show as-is
    // instead of a raw "서버 오류: 500".
    var result = {};
    try {
      result = await response.json();
    } catch (e) {
      // Body wasn't JSON (rare) — fall back to a soft message below
    }

    if (response.ok && result.success) {
      // Display mirror
      displayMirror(result.mirrorText, result.mirrorId, result.sessionId);
      // Auto-switch to mirror tab
      if (typeof switchTab === 'function') {
        setTimeout(function() { switchTab('mirror'); }, 500);
      }
    } else {
      // Show the server's gentle message (or a soft default)
      alert(result.error || '잠깐 문제가 생겼어요. 잠시 뒤에 다시 보내 주세요.');
    }
  } catch (error) {
    // Network or other errors — keep the tone soft, no technical detail
    alert('잠깐 연결이 어려워요. 잠시 뒤에 다시 보내 주세요.');
  } finally {
    // Always release the lock and restore the button (even on error)
    isSubmitting = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = '';
      sendBtn.style.cursor = '';
      sendBtn.textContent = originalText || '보내기';
    }
  }
}

/**
 * generatePrompt - Generate Claude prompt from form data
 * @param {object} data - Form data from collectFormData
 * @returns {string} - Formatted prompt for Claude
 */
function generatePrompt(data) {
  return `당신은 거울입니다. 고객이 쓴 기록을 정렬하고 비춰주는 것이 전부입니다.

[입력된 기록]
- 감각: ${data.sensations}
- 한 단어: ${data.oneWord}
- 장면: ${data.scene}
- 그때 감각: ${data.sceneSensation}
- 내 해석: ${data.sceneInterpretation}
- 목소리 A: ${data.voiceA}
- 목소리 B: ${data.voiceB}
- 오늘의 한 문장: ${data.oneSentence}
- 문장 읽을 때: ${data.sentenceFeeling}
- 내일 행동: ${data.tomorrowAction}
- 감사: ${Array.isArray(data.gratitude) ? data.gratitude.join(', ') : data.gratitude}

[규칙]
1. 고객의 단어를 그대로 사용하되, 문단처럼 자연스럽게 정렬
2. 반복되는 패턴 1가지를 짚고, 괄호로 의미를 기울임체로 표현 (단 한 번만)
3. 마지막 문단에서 "평온함을 찾게 하는" 내용 추가 (판단/조언/해석 없음)
4. 금지: 명상, 소마틱, 치유, 회복, 성장, 코칭, 이모지, 동기부여
5. 출력: ○○님, [정돈된 기록] [패턴 비춤] [마지막 문단] — 이어`;
}

/**
 * Show draft section and populate prompt
 */
function showDraftPrompt() {
  try {
    var form = document.getElementById('form');
    var formData = collectFormData(form);

    var prompt = generatePrompt(formData);
    var promptTextarea = document.getElementById('prompt-text');
    var mirrorSection = document.getElementById('mirror-section');
    var draftPromptSection = document.getElementById('draft-prompt');

    if (!promptTextarea || !mirrorSection || !draftPromptSection) {
      alert('UI 요소를 찾을 수 없습니다.');
      return;
    }

    promptTextarea.value = prompt;
    mirrorSection.style.display = 'block';
    draftPromptSection.style.display = 'block';
    document.getElementById('mirror-display').style.display = 'none';

    mirrorSection.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    alert('오류: ' + error.message);
  }
}

/**
 * Copy prompt to clipboard
 */
function copyPromptToClipboard() {
  var promptTextarea = document.getElementById('prompt-text');
  if (!promptTextarea) return;

  promptTextarea.select();
  document.execCommand('copy');

  var btn = document.getElementById('copyPromptBtn');
  var original = btn.textContent;
  btn.textContent = '✓ 복사됨';
  setTimeout(function() {
    btn.textContent = original;
  }, 2000);
}

/**
 * Approve draft and show final mirror
 */
function approveDraft() {
  var draftText = document.getElementById('mirror-draft').value.trim();
  if (!draftText) {
    alert('결과를 붙여넣으세요.');
    return;
  }

  var mirrorDisplay = document.getElementById('mirror-display');
  var mirrorText = document.getElementById('mirror-text');
  var mirrorSection = document.getElementById('mirror-section');
  var draftPromptSection = document.getElementById('draft-prompt');

  mirrorText.textContent = draftText;
  mirrorDisplay.style.display = 'block';
  draftPromptSection.style.display = 'none';

  // Save to localStorage
  var sessionId = 'session_' + Date.now();
  var mirrorId = 'mirror_' + Date.now();
  var mirrorRecord = {
    mirrorText: draftText,
    mirrorId: mirrorId,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  };
  try {
    localStorage.setItem('mirror_' + sessionId, JSON.stringify(mirrorRecord));
  } catch (e) {
    console.warn('localStorage not available');
  }
}

// Event listeners (on page load)
document.addEventListener('DOMContentLoaded', function() {
  var draftBtn = document.getElementById('draftBtn');
  var copyBtn = document.getElementById('copyPromptBtn');
  var approveBtn = document.getElementById('approveBtn');

  if (draftBtn) {
    draftBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showDraftPrompt();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      copyPromptToClipboard();
    });
  }

  if (approveBtn) {
    approveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      approveDraft();
    });
  }

  // Existing form submission handler
  var form = document.getElementById('form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitAndShowMirror(form);
    });
  }
});

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    collectFormData,
    displayMirror,
    submitAndShowMirror,
    generatePrompt,
    showDraftPrompt,
    copyPromptToClipboard,
    approveDraft
  };
}
