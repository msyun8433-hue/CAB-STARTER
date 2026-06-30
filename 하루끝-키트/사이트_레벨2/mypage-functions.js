/**
 * My Sessions - View and manage sessions created by admin
 */

let allSessions = [];
const ALLOWED_EMAIL = 'msyun8433@gmail.com';

/**
 * Handle Google credential response
 */
function handleCredentialResponse(response) {
  var token = response.credential;
  var payload = JSON.parse(atob(token.split('.')[1]));

  if (payload.email !== ALLOWED_EMAIL) {
    alert('접근 권한이 없습니다. (' + payload.email + ')');
    return;
  }

  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_email', payload.email);
  localStorage.setItem('admin_name', payload.name);

  showSessionsSection();
  loadSessions();
}

/**
 * Check if user is logged in
 */
function checkAuth() {
  var token = localStorage.getItem('admin_token');
  var email = localStorage.getItem('admin_email');

  if (token && email === ALLOWED_EMAIL) {
    showSessionsSection();
    loadSessions();
  } else {
    showLoginSection();
  }
}

/**
 * Show login section
 */
function showLoginSection() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('sessions-section').style.display = 'none';
}

/**
 * Show sessions section
 */
function showSessionsSection() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('sessions-section').style.display = 'block';
}

/**
 * Load all sessions
 */
async function loadSessions() {
  try {
    var token = localStorage.getItem('admin_token');
    if (!token) {
      checkAuth();
      return;
    }

    const listEl = document.getElementById('list');
    listEl.innerHTML = '<div class="loading">로딩 중...</div>';

    const response = await fetch('/api/sessions', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!response.ok) {
      throw new Error('서버 오류: ' + response.status);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || '데이터를 불러올 수 없습니다');
    }

    allSessions = result.data;
    displaySessions(allSessions);
  } catch (error) {
    const listEl = document.getElementById('list');
    listEl.innerHTML = `<div class="error">오류: ${error.message}</div>`;
  }
}

/**
 * Display sessions in the list
 */
function displaySessions(sessions) {
  const listEl = document.getElementById('list');

  if (!sessions || sessions.length === 0) {
    listEl.innerHTML = '<div class="empty">아직 만든 세션이 없습니다.</div>';
    return;
  }

  // Sort by date (newest first)
  sessions.sort(function(a, b) {
    return new Date(b.recorded_at) - new Date(a.recorded_at);
  });

  listEl.innerHTML = sessions.map(session => {
    var date = new Date(session.recorded_at);
    var dateStr = date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
    var hasMirror = session.has_mirror ? '받음' : '대기중';
    var mirrorClass = session.has_mirror ? 'status-mirrored' : 'status-recorded';

    var title = session.user_name ? session.user_name : (session.one_word ? session.one_word : '기록');
    return `<div class="item" onclick="showSessionDetail('${escapeHtml(session.id)}')">
      <div class="item-header">
        <div>
          <div class="item-title">${escapeHtml(title)}</div>
          <div class="item-date">${dateStr}</div>
        </div>
        <span class="status-badge ${mirrorClass}">거울 글 ${hasMirror}</span>
      </div>
      <div class="item-text">
        <strong>감각:</strong> ${escapeHtml(session.sensations || '-')}<br>
        <strong>한 단어:</strong> ${escapeHtml(session.one_word || '-')}
      </div>
    </div>`;
  }).join('');
}

/**
 * Filter sessions by search term
 */
function filterSessions(searchTerm) {
  if (!searchTerm.trim()) {
    displaySessions(allSessions);
    return;
  }

  const term = searchTerm.toLowerCase();
  const filtered = allSessions.filter(session => {
    const oneWord = (session.one_word || '').toLowerCase();
    const sensations = (session.sensations || '').toLowerCase();

    return oneWord.includes(term) || sensations.includes(term);
  });

  displaySessions(filtered);
}

/**
 * Show session detail
 */
function showSessionDetail(sessionId) {
  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return;

  var html = `<div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999;" onclick="if(event.target===this)closeDetail()">
    <div style="background:white; border-radius:12px; padding:30px; max-width:600px; max-height:80vh; overflow-y:auto;">
      <button onclick="closeDetail()" style="float:right; background:none; border:none; font-size:24px; cursor:pointer; color:#ccc;">×</button>
      <h2 style="margin:0 0 4px;">${escapeHtml(session.user_name || session.one_word || '기록')}</h2>
      <div style="color:#999; font-size:13px; margin-bottom:20px;">${new Date(session.recorded_at).toLocaleDateString('ko-KR')}</div>

      <div style="background:#f9f7f2; border-left:3px solid #b9784f; padding:14px; margin-bottom:20px; border-radius:4px;">
        <div style="font-weight:600; margin-bottom:8px;">세션 정보</div>
        <div style="font-size:14px; line-height:1.8;">
          <strong>감각:</strong> ${escapeHtml(session.sensations || '-')}<br>
          <strong>한 단어:</strong> ${escapeHtml(session.one_word || '-')}<br>
          <strong>장면:</strong> ${escapeHtml((session.scene || '-').substring(0, 50))}
        </div>
      </div>

      ${session.mirror_text ? `<div style="background:#faf7f2; border-left:4px solid #b9784f; padding:14px; margin-bottom:20px; border-radius:4px;">
        <div style="font-weight:600; margin-bottom:8px;">거울 글</div>
        <div style="white-space:pre-wrap; line-height:1.8; font-size:14px;">${escapeHtml(session.mirror_text)}</div>
      </div>` : '<div style="padding:14px; background:#f0f0f0; border-radius:4px; color:#666; font-size:14px;">아직 거울 글이 없습니다.</div>'}

      <button onclick="copyToClipboard('${escapeHtml(session.mirror_text || '')}')" style="width:100%; padding:12px; background:#b9784f; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">복사</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Close detail modal
 */
function closeDetail() {
  var modal = document.querySelector('[onclick*="closeDetail"]').parentElement.parentElement;
  modal.remove();
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  if (!text) {
    alert('복사할 내용이 없습니다.');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    alert('복사되었습니다');
  });
}

/**
 * Logout
 */
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_name');
  showLoginSection();
  if (window.google) {
    google.accounts.id.disableAutoSelect();
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}
