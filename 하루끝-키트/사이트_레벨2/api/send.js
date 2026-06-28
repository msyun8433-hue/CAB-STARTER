// 서버에서만 도는 중계. 메일 주소가 고객 화면(소스)에 안 보이게 한다.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
  try {
    let data = req.body;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }
    if (!data || typeof data !== 'object') data = {};
    const r = await fetch('https://formsubmit.co/ajax/msyun8433@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://harukkeut-site.vercel.app',
        'Referer': 'https://harukkeut-site.vercel.app/session.html'
      },
      body: JSON.stringify(data)
    });
    const txt = await r.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, fs_status: r.status, fs: txt.slice(0, 400) }));
  } catch (e) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: String(e) }));
  }
};
