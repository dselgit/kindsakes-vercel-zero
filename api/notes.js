export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  try {
    const { senderEmail, recipientEmail, message, occasion, anonymous } = req.body || {};

    // 1) make a token + link
    const token = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    const base = process.env.SITE_URL || `https://${req.headers.host}`;
    const magicLink = `${base}/note/${token}`;

    // 2) save to Supabase via REST (no SDK install needed)
    const row = {
      sender_email: senderEmail || null,
      recipient_email: recipientEmail || null,
      message: message || null,
      occasion: occasion || null,
      anonymous: !!anonymous,
      token
    };

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

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ ok: false, error: 'Supabase insert failed', details: txt });
    }

    return res.status(200).json({ ok: true, magicLink, token });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Bad JSON' });
  }
}
