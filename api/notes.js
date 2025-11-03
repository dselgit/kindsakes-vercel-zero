export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });

  // read raw body
  const raw = await new Promise((resolve) => {
    let data = ''; req.on('data', c => data += c); req.on('end', () => resolve(data || ''));
  });

  // parse according to content-type
  const ct = (req.headers['content-type'] || '').toLowerCase();
  let body = {};
  try {
    if (ct.includes('application/json')) {
      body = raw ? JSON.parse(raw) : (typeof req.body === 'object' ? req.body : {});
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const p = new URLSearchParams(raw);
      body = Object.fromEntries(p.entries());
    } else {
      // fallbacks
      body = typeof req.body === 'object' && req.body ? req.body : {};
    }
  } catch { body = {}; }

  // normalize fields (Zapier checkboxes may be "true"/"on"/"Yes")
  const yes = new Set(['true','on','yes','1']);
  const senderEmail    = body.senderEmail || body.sender_email || null;
  const recipientEmail = body.recipientEmail || body.recipient_email || null;
  const message        = body.message || null;
  const occasion       = body.occasion || null;
  const anonymous      = yes.has(String(body.anonymous || '').toLowerCase());

  // token + link
  const token = Array.from({ length: 16 }, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join('');
  const base = process.env.SITE_URL || `https://${req.headers.host}`;
  const magicLink = `${base}/note/${token}`;

  // save to Supabase REST
  const row = { sender_email: senderEmail, recipient_email: recipientEmail, message, occasion, anonymous, token };
  const url = `${process.env.SUPABASE_URL}/rest/v1/notes`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });

  if (!r.ok) return res.status(500).json({ ok:false, error:'Supabase insert failed', details: await r.text() });
  return res.status(200).json({ ok:true, magicLink, token, received: row });
}
