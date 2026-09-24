import supabase from './db-client.js';

export default async function handler(req, res) {
  const origin = req.headers.origin;
  let sameOrigin = !origin;
  try { if (origin) sameOrigin = new URL(origin).host === req.headers.host && (new URL(origin).protocol === 'https:' || new URL(origin).hostname === 'localhost'); } catch { sameOrigin = false; }
  if (sameOrigin && origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (!sameOrigin) return res.status(403).json({ error: 'Forbidden' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Sign in to use presets.' });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('presets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).json({ error: 'JSON required.' });
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const options = req.body?.options;
      if (!name || name.length > 60 || /[\x00-\x1f\x7f]/.test(name) || !Array.isArray(options) || options.length < 2 || options.length > 50 || options.some(x => typeof x !== 'string' || !x.trim() || x.length > 45 || /[\x00-\x1f\x7f]/.test(x))) return res.status(400).json({ error: 'Add a name and 2–50 valid options.' });
      const { count, error: countError } = await supabase.from('presets').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if (countError) throw countError;
      if (count >= 30) return res.status(400).json({ error: 'Maximum of 30 saved wheels reached. Delete one to save another.' });
      const { data, error } = await supabase.from('presets').insert({ user_id: user.id, name, options: options.map(x => x.trim()) }).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'DELETE') {
      if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).json({ error: 'JSON required.' });
      const id = Number(req.body?.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid preset.' });
      const { error } = await supabase.from('presets').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Presets API error:', err);
    return res.status(500).json({ error: 'Unable to process your request right now.' });
  }
}
