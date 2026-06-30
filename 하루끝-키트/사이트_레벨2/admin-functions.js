/**
 * Admin Functions - Manage mirrors and customer sessions
 */

let allMirrors = [];
const ALLOWED_EMAIL = 'msyun8433@gmail.com';

/**
 * Handle Google credential response
 */
function handleCredentialResponse(response) {
  // Decode JWT token
  var token = response.credential;
  var payload = JSON.parse(atob(token.split('.')[1]));

  // Check email
  if (payload.email !== ALLOWED_EMAIL) {
    alert('접근 권한이 없습니다. (' + payload.email + ')');
    return;
  }

  // Save token and show admin section
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_email', payload.email);
  localStorage.setItem('admin_name', payload.name);

  showAdminSection();
  loadMirrors();
}

/**
 * Check if user is logged in
 */
function checkAuth() {
  var token = localStorage.getItem('admin_token');
  var email = localStorage.getItem('admin_email');

  if (token && email === ALLOWED_EMAIL) {
    showAdminSection();
    loadMirrors();
  } else {
    showLoginSection();
  }
}

/**
 * Show login section
 */
function showLoginSection() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('admin-section').style.display = 'none';
}

/**
 * Show admin section
 */
function showAdminSection() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('admin-section').style.display = 'block';
  var name = localStorage.getItem('admin_name');
  if (name) {
    // Update header with user name
    console.log('Logged in as:', name);
  }
}

/**
 * Logout
 */
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_name');
  showLoginSection();
  // Reset Google Sign-In
  if (window.google) {
    google.accounts.id.disableAutoSelect();
  }
}

/**
 * Load all mirrors from /api/mirrors endpoint
 */
async function loadMirrors() {
  try {
    var token = localStorage.getItem('admin_token');
    if (!token) {
      checkAuth();
      return;
    }

    const listEl = document.getElementById('list');
    listEl.innerHTML = '<div class="loading">로딩 중...</div>';

    const response = await fetch('/api/mirrors', {
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

    allMirrors = result.data;
    displayMirrors(allMirrors);
  } catch (error) {
    const listEl = document.getElementById('list');
    listEl.innerHTML = `<div class="error">오류: ${error.message}</div>`;
  }
}

/**
 * Display mirrors in the list
 */
function displayMirrors(mirrors) {
  const listEl = document.getElementById('list');

  if (!mirrors || mirrors.length === 0) {
    listEl.innerHTML = '<div class="empty">아직 저장된 거울 글이 없습니다.</div>';
    return;
  }

  listEl.innerHTML = mirrors.map(mirror => {
    var date = new Date(mirror.created_at);
    var dateStr = date.toLocaleDateString('ko-KR');
    return `<div class="item" onclick="showDetail('${mirror.id}')">
      <div class="item-header">
        <div>
          <div class="item-title">${escapeHtml(mirror.user_name || '(이름 없음)')}</div>
          <div class="item-date">${dateStr}${mirror.user_contact ? ' · ' + escapeHtml(mirror.user_contact) : ''}</div>
        </div>
      </div>
      <div class="item-text">${escapeHtml((mirror.mirror_text || '').substring(0, 100))}...</div>
    </div>`;
  }).join('');
}

/**
 * Filter mirrors by search term
 */
function filterMirrors(searchTerm) {
  if (!searchTerm.trim()) {
    displayMirrors(allMirrors);
    return;
  }

  const term = searchTerm.toLowerCase();
  const filtered = allMirrors.filter(mirror => {
    const text = (mirror.mirror_text || '').toLowerCase();
    return text.includes(term);
  });

  displayMirrors(filtered);
}

/**
 * Show detail of a specific mirror
 */
function showDetail(mirrorId) {
  const mirror = allMirrors.find(m => m.id === mirrorId);
  if (!mirror) return;

  const html = `
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:999;" onclick="if(event.target===this)closeDetail()">
      <div style="background:white; border-radius:12px; padding:30px; max-width:600px; max-height:80vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
          <div>
            <h2 style="margin:0 0 4px; font-size:20px;">${escapeHtml(mirror.user_name || '(이름 없음)')}</h2>
            <div style="color:#999; font-size:13px;">${formatDate(mirror.created_at)}${mirror.user_contact ? ' · ' + escapeHtml(mirror.user_contact) : ''}</div>
          </div>
          <button onclick="closeDetail()" style="background:none; border:none; font-size:24px; cursor:pointer; padding:0; color:#ccc;">×</button>
        </div>

        <div style="background:#f9f7f2; border-left:3px solid #b9784f; padding:14px; margin-bottom:20px; border-radius:4px;">
          <div style="white-space:pre-wrap; line-height:1.8;">${escapeHtml(mirror.mirror_text)}</div>
        </div>

        <div style="font-size:11px; font-family:monospace; color:#999;">ID: ${mirror.id}</div>

        <button onclick="copyToClipboard('${escapeHtml(mirror.mirror_text)}')" style="margin-top:20px; width:100%; padding:12px; background:#b9784f; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">복사</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Close detail modal
 */
function closeDetail() {
  const modal = document.querySelector('[onclick*="closeDetail"]').parentElement.parentElement;
  modal.remove();
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('복사되었습니다');
  });
}

/**
 * Helper: Escape HTML
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

/**
 * Helper: Truncate text
 */
function truncate(text, length) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
