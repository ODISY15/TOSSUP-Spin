import supabase from './db-client.js';

export default async function handler(req, res) {
  const origin = req.headers.origin;
  let sameOrigin = !origin;
  try { if (origin) sameOrigin = new URL(origin).host === req.headers.host && (new URL(origin).protocol === 'https:' || new URL(origin).hostname === 'localhost'); } catch { sameOrigin = false; }
  if (sameOrigin && origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (!sameOrigin) return res.status(403).json({ error: 'Forbidden.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!req.headers['content-type']?.startsWith('application/json') || req.body?.consent !== true) return res.status(400).json({ error: 'Explicit newsletter consent is required.' });
  try {
    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in first.' });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email || !user.email_confirmed_at) return res.status(401).json({ error: 'Please verify your email and sign in before subscribing.' });
    const { data: existing, error: lookupError } = await supabase.from('newsletter_consents').select('status').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && ['pending', 'active', 'validating'].includes(existing.status)) return res.status(200).json({ subscribed: true });
    if (existing) return res.status(409).json({ error: 'This address was previously unsubscribed. Use the newsletter signup form to rejoin.' });
    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    if (!apiKey || !publicationId) return res.status(503).json({ error: 'Newsletter signup is not available yet. Your Tossup account is unaffected.' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(`https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, reactivate_existing: false, send_welcome_email: true, double_opt_override: 'on', utm_source: 'tossup', utm_medium: 'signup' }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) return res.status(502).json({ error: 'Could not complete newsletter signup. Your Tossup account is unaffected.' });
    const payload = await response.json();
    const { error: saveError } = await supabase.from('newsletter_consents').insert({ user_id: user.id, email: user.email, status: payload?.data?.status || 'pending', provider: 'beehiiv' }).select('*').single();
    if (saveError && saveError.code !== '23505') throw saveError;
    return res.status(200).json({ subscribed: true });
  } catch (err) {
    console.error('Newsletter API error:', err);
    return res.status(500).json({ error: 'Newsletter signup is temporarily unavailable. Your Tossup account is unaffected.' });
  }
}
