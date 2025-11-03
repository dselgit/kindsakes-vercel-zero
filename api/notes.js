export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ ok:false, error: 'Use POST' });
    return;
  }
  try {
    const { senderEmail, recipientEmail, message, occasion, anonymous } = request.body || {};
    const token = Array.from({length:16}, () => Math.floor(Math.random()*256)
      .toString(16).padStart(2,'0')).join('');
    const base = process.env.SITE_URL || `https://${request.headers.host}`;
    const magicLink = `${base}/note/${token}`;
    response.status(200).json({ ok:true, magicLink, received:{ senderEmail, recipientEmail, occasion, anonymous, messageLength: (message||'').length } });
  } catch (e) {
    response.status(400).json({ ok:false, error:'Bad JSON' });
  }
}