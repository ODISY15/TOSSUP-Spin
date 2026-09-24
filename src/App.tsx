import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Heart, LockKeyhole, Moon, Plus, RotateCcw, Save, Settings2, Shuffle, Sparkles, Sun, Trash2, Volume2, X } from 'lucide-react';
import supabase from './lib/supabase';
import { signInWithGoogle, handleGoogleRedirect } from './lib/googleAuth';
import { playTick, playWin, type SoundMode } from './lib/sound';
import AdSlot from './components/AdSlot';
import './index.css';
import './enhancements.css';

void handleGoogleRedirect();

type Variant = { name: string; base: string; end: string; ink: string; surface: string; colors: string[] };
type Theme = { id: number; slug: string; name: string; symbol: string; variants: Variant[] };
type Suggestion = { id: number; label: string };
type Preset = { id: number; name: string; options: string[]; created_at: string };
type Collection = { id: number; category: string; name: string; mode: string; options: string[] };
type ResultMessage = { id: number; message: string; animation: string };
const readStored = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } };
const saveStored = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing or embedded storage restrictions */ } };
const hasStored = (key: string) => { try { return localStorage.getItem(key) !== null; } catch { return false; } };
const request = async (url: string, init?: RequestInit) => {
  const get = !init?.method || init.method === 'GET';
  const attempts = get ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    init?.signal?.addEventListener('abort', abort, { once: true });
    if (init?.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 18000);
    let response: Response;
    try { response = await fetch(url, { ...init, signal: controller.signal }); }
    catch (error) {
      if (init?.signal?.aborted || !get || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 650 * (attempt + 1)));
      continue;
    } finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
    const data = await response.json().catch(() => ({ error: 'The server returned an unexpected response.' }));
    if (response.ok) return data;
    if (get && response.status >= 500 && attempt < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 650 * (attempt + 1)));
      continue;
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  throw new Error('Unable to load data. Please try again.');
};
const point = (angle: number, radius: number) => ({ x: 200 + radius * Math.cos((angle - 90) * Math.PI / 180), y: 200 + radius * Math.sin((angle - 90) * Math.PI / 180) });

function Wheel({ options, colors, rotation, spinning, duration, easing, dark }: { options: string[]; colors: string[]; rotation: number; spinning: boolean; duration: number; easing: string; dark: boolean }) {
  const step = 360 / Math.max(options.length, 1);
  const fontSize = options.length > 18 ? 10 : options.length > 12 ? 12 : options.length > 8 ? 14 : 17;
  return <div className="wheel-shell">
    <div className="wheel-outer-ring" />
    <div className="wheel-pointer" aria-hidden="true"><div /></div>
    <svg className="wheel-svg" viewBox="0 0 400 400" role="img" aria-label={`Spinner wheel with ${options.length} options`} style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${duration}ms ${easing}` : 'none' }}>
      <circle cx="200" cy="200" r="198" fill={colors[0]} />
      {options.map((option, i) => {
        const start = i * step, end = (i + 1) * step;
        const a = point(start, 196), b = point(end, 196);
        const path = `M 200 200 L ${a.x} ${a.y} A 196 196 0 ${step > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
        const center = start + step / 2;
        const pos = point(center, options.length > 14 ? 127 : 122);
        const flip = center > 90 && center < 270;
        const label = option.length > (options.length > 10 ? 13 : 18) ? option.slice(0, options.length > 10 ? 12 : 17) + '…' : option;
        return <g key={`${i}-${option}`}><path d={path} fill={colors[i % colors.length]} stroke="rgba(255,255,255,.35)" strokeWidth="1.8"/><text x={pos.x} y={pos.y} transform={`rotate(${center - 90 + (flip ? 180 : 0)},${pos.x},${pos.y})`} fill={dark ? '#f8f5ee' : '#15221f'} fontSize={fontSize} fontWeight="800" fontFamily="'DM Sans', sans-serif" textAnchor="middle" dominantBaseline="central">{label}</text></g>;
      })}
      <circle cx="200" cy="200" r="18" fill="#ffffff" stroke="rgba(25,40,37,.09)" strokeWidth="3" />
      <circle cx="200" cy="200" r="7" fill="#15221f" />
      <circle cx="200" cy="200" r="198" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="5" />
    </svg>
  </div>;
}

function App() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [resultMessages, setResultMessages] = useState<ResultMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [themeSlug, setThemeSlug] = useState(() => readStored('tossup-theme', 'sunroom'));
  const [variantIndex, setVariantIndex] = useState(() => readStored('tossup-variant', 0));
  const [options, setOptions] = useState<string[]>(() => readStored('tossup-options', []));
  const [draft, setDraft] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [sound, setSound] = useState<SoundMode>(() => readStored('tossup-sound', 'classic'));
  const [animation, setAnimation] = useState(() => readStored('tossup-animation', 'jackpot'));
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => readStored('tossup-appearance', 'light'));
  const [hoverColor, setHoverColor] = useState('#ffd36d');
  const [reels, setReels] = useState([0, 1, 2]);
  const [spins, setSpins] = useState(() => readStored('tossup-spins', 0));
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState('');
  const [resultMessage, setResultMessage] = useState<ResultMessage | null>(null);
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetOpen, setPresetOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authSignup, setAuthSignup] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [legalOpen, setLegalOpen] = useState<'privacy' | 'terms' | null>(null);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const previousPickRef = useRef('');
  const previousMessageRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.all([request('/api/themes', { signal: controller.signal }), request('/api/suggestions', { signal: controller.signal })]).then(([themeRows, suggestionRows]) => {
      if (!active) return;
      setThemes(themeRows); setSuggestions(suggestionRows);
      if (!hasStored('tossup-options')) setOptions(suggestionRows.slice(0, 6).map((s: Suggestion) => s.label));
    }).catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    Promise.allSettled([request('/api/option-collections', { signal: controller.signal }), request('/api/result-messages', { signal: controller.signal })]).then(([collectionRows, messageRows]) => {
      if (!active) return;
      if (collectionRows.status === 'fulfilled') setCollections(collectionRows.value);
      if (messageRows.status === 'fulfilled') setResultMessages(messageRows.value);
    });
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user ? { id: data.user.id, email: data.user.email } : null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { active = false; controller.abort(); subscription.unsubscribe(); if (spinTimer.current) clearTimeout(spinTimer.current); if (tickTimer.current) clearInterval(tickTimer.current); if (reelTimer.current) clearInterval(reelTimer.current); soundTimers.current.forEach(clearTimeout); };
  }, []);
  useEffect(() => { if (!loading) saveStored('tossup-options', options); }, [options, loading]);
  useEffect(() => { saveStored('tossup-theme', themeSlug); saveStored('tossup-variant', variantIndex); }, [themeSlug, variantIndex]);
  useEffect(() => { saveStored('tossup-sound', sound); }, [sound]);
  useEffect(() => { saveStored('tossup-animation', animation); }, [animation]);
  useEffect(() => { saveStored('tossup-appearance', appearance); document.documentElement.style.colorScheme = appearance; }, [appearance]);
  useEffect(() => { saveStored('tossup-spins', spins); }, [spins]);
  useEffect(() => { const onDown = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false); if (collectionRef.current && !collectionRef.current.contains(event.target as Node)) setCollectionOpen(false); }; document.addEventListener('mousedown', onDown); return () => document.removeEventListener('mousedown', onDown); }, []);
  useEffect(() => { if (!result) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setResult(''); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [result]);

  const fetchPresets = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPresets([]); return; }
    try { setPresets(await request('/api/presets', { headers: { Authorization: `Bearer ${session.access_token}` } })); }
    catch (e) { setNotice((e as Error).message); }
  }, []);
  useEffect(() => { if (user) void fetchPresets(); else setPresets([]); }, [user, fetchPresets]);
  useEffect(() => { if (user) setAuthOpen(false); }, [user]);
  useEffect(() => {
    if (!user?.email) return;
    const pending = sessionStorage.getItem('tossup-newsletter-pending');
    const freshGoogleConsent = pending?.startsWith('google:') && Date.now() - Number(pending.slice(7)) < 5 * 60 * 1000;
    if (pending?.toLowerCase() !== user.email.toLowerCase() && !freshGoogleConsent) {
      if (pending?.startsWith('google:')) sessionStorage.removeItem('tossup-newsletter-pending');
      return;
    }
    sessionStorage.removeItem('tossup-newsletter-pending');
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await request('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ consent: true }) });
        setNotice('Check your inbox to confirm your optional newsletter subscription.');
      } catch (e) { setNotice((e as Error).message); }
    })();
  }, [user]);

  const theme = themes.find(t => t.slug === themeSlug) || themes[0];
  const variant = theme?.variants[Math.min(Math.max(variantIndex, 0), theme.variants.length - 1)];
  const sceneName = theme?.slug === 'terra' ? 'terracotta' : theme?.slug;
  const darkSuffix = variantIndex === 0 ? '-dark' : variantIndex === 1 || variantIndex === 5 ? '-dark-alt' : variantIndex === 2 ? '-dark-third' : variantIndex === 4 ? '-alt' : '';
  const sceneUrl = `/backgrounds/${sceneName}${appearance === 'dark' ? darkSuffix : variantIndex >= 3 ? '-alt' : ''}.jpg`;
  const wheelColors = appearance === 'dark' ? variant?.colors.map(hex => {
    const red = parseInt(hex.slice(1, 3), 16), green = parseInt(hex.slice(3, 5), 16), blue = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(red * .42 + 9)}, ${Math.round(green * .42 + 18)}, ${Math.round(blue * .42 + 21)})`;
  }) : variant?.colors;
  const unlocked = spins > 5 || options.length > 10;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spinDuration = reducedMotion ? 1100 : animation === 'turbo' ? 3200 : animation === 'suspense' ? 7000 : 5200;
  const spinEasing = animation === 'bounce' ? 'cubic-bezier(.16,.85,.19,1.08)' : animation === 'turbo' ? 'cubic-bezier(.08,.7,.05,1)' : 'cubic-bezier(.12,.78,.08,1)';
  const activeDraft = draft.split(',').at(-1)?.trim().toLocaleLowerCase() || '';
  const matchingSuggestions = suggestions.filter(s => !options.some(o => o.toLocaleLowerCase() === s.label.toLocaleLowerCase()) && s.label.toLocaleLowerCase().includes(activeDraft));
  const addOption = (value: string) => {
    if (spinning) return;
    const entries = value.split(',').map(item => item.trim()).filter(Boolean);
    if (!entries.length) { setNotice('Type at least one option to add. Empty comma entries are skipped.'); return; }
    if (entries.some(item => item.length > 45)) { setNotice('Keep each option under 45 characters.'); return; }
    const unique: string[] = [];
    const seen = new Set(options.map(item => item.toLocaleLowerCase()));
    for (const item of entries) { const key = item.toLocaleLowerCase(); if (!seen.has(key)) { unique.push(item); seen.add(key); } }
    if (!unique.length) { setNotice('Those options are already on the wheel.'); return; }
    if (options.length + unique.length > 50) { setNotice(`You can add ${50 - options.length} more option${50 - options.length === 1 ? '' : 's'} (50 maximum).`); return; }
    setOptions(prev => [...prev, ...unique]); setDraft(''); setDropdownOpen(false); setResult(''); setNotice('');
  };
  const shuffleChoices = (choices: string[]) => {
    const copy = [...choices];
    for (let i = copy.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  const loadCollection = (collection?: Collection) => {
    if (spinning) return;
    if (!collections.length) { setNotice('Quick presets are unavailable right now. Add your own options instead.'); return; }
    const pool = collection ? collection.options : [...new Set(collections.flatMap(item => item.options))];
    if (!pool.length) return;
    let next = collection?.mode === 'fixed' ? [...pool] : shuffleChoices(pool).slice(0, collection ? 6 : 7);
    if (next.join('|') === previousPickRef.current && pool.length > 1) {
      if (pool.length > next.length) next = [pool.find(item => !next.includes(item))!, ...next.slice(1)];
      else next = [...next.slice(1), next[0]];
    }
    previousPickRef.current = next.join('|');
    setOptions(next); setResult(''); setCollectionOpen(false); setNotice(collection ? `${collection.name} is ready to spin.` : 'A fresh surprise is ready to spin.');
  };
  const spin = () => {
    if (spinning) return;
    if (options.length < 2) { setNotice('Add at least two options to spin.'); return; }
    setNotice(''); setResult('');
    const winner = crypto.getRandomValues(new Uint32Array(1))[0] % options.length;
    const step = 360 / options.length;
    const jitter = (Math.random() - .5) * step * .5;
    const target = ((360 - (winner + .5) * step + jitter) % 360 + 360) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const turns = reducedMotion ? 1 : 7;
    const delta = animation === 'reverse' ? -(((current - target + 360) % 360) + 360 * turns) : ((target - current + 360) % 360) + 360 * turns;
    setSpinning(true); setRotation(prev => prev + delta);
    if (animation === 'jackpot' && !reducedMotion) {
      let frame = 0;
      reelTimer.current = setInterval(() => { frame++; setReels([frame % options.length, (frame + 2) % options.length, (frame + 4) % options.length]); }, 80);
    }
    if (sound !== 'off') {
      const started = performance.now();
      const scheduleTick = () => {
        const progress = Math.min(1, (performance.now() - started) / spinDuration);
        if (progress >= .96) return;
        playTick(sound);
        soundTimers.current.push(setTimeout(scheduleTick, 75 + 320 * progress * progress));
      };
      scheduleTick();
    }
    spinTimer.current = setTimeout(() => {
      if (reelTimer.current) clearInterval(reelTimer.current);
      soundTimers.current.forEach(clearTimeout); soundTimers.current = [];
      const available = resultMessages.filter(item => item.id !== previousMessageRef.current);
      const message = available.length ? available[crypto.getRandomValues(new Uint32Array(1))[0] % available.length] : resultMessages[0] || null;
      previousMessageRef.current = message?.id ?? null;
      setResultMessage(message); setReels([winner, winner, winner]); setSpinning(false); setResult(options[winner]); setSpins(prev => prev + 1); playWin(sound);
    }, spinDuration + 100);
  };
  const savePreset = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (options.length < 2) { setNotice('Add at least two options before saving.'); return; }
    const name = presetName.trim() || `My wheel ${presets.length + 1}`;
    if (name.length > 60) { setNotice('Keep preset names under 60 characters.'); return; }
    setSaving(true); setNotice('');
    try { const { data: { session } } = await supabase.auth.getSession(); await request('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ name, options }) }); await fetchPresets(); setPresetName(''); setNotice('Preset saved to your account.'); }
    catch (e) { setNotice((e as Error).message); } finally { setSaving(false); }
  };
  const deletePreset = async (id: number) => {
    try { const { data: { session } } = await supabase.auth.getSession(); await request('/api/presets', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id }) }); await fetchPresets(); setNotice('Preset deleted.'); }
    catch (e) { setNotice((e as Error).message); }
  };
  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setAuthError('');
    if (!authEmail.includes('@')) { setAuthError('Enter a valid email address.'); return; }
    if (authPassword.length < (authSignup ? 10 : 6)) { setAuthError(authSignup ? 'Use at least 10 characters for a new password.' : 'Enter your password.'); return; }
    setAuthBusy(true);
    if (authSignup && newsletterConsent) sessionStorage.setItem('tossup-newsletter-pending', authEmail.trim());
    const { data, error: err } = authSignup ? await supabase.auth.signUp({ email: authEmail, password: authPassword }) : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setAuthBusy(false);
    if (err) { if (authSignup) sessionStorage.removeItem('tossup-newsletter-pending'); setAuthError(err.message); return; }
    if (authSignup && !data.session) { setAuthError('Check your inbox to confirm your account, then sign in.'); return; }
    setAuthOpen(false); setAuthPassword(''); setNewsletterConsent(false); setNotice('You’re signed in. Your wheels are ready to save.');
  };
  const setTheme = (slug: string) => { setThemeSlug(slug); setVariantIndex(0); };
  const changeVariant = (index: number) => { if (!theme) return; setVariantIndex((index + theme.variants.length) % theme.variants.length); };

  if (loading) return <div className="loading-screen"><div className="loading-mark">T<span>.</span></div><div className="loading-spinner" /><p>Setting up your wheel...</p></div>;
  if (error || !theme || !variant) return <div className="loading-screen"><div className="loading-mark">T<span>.</span></div><p>{error || 'Could not load the wheel.'}</p><button className="primary-btn" onClick={() => window.location.reload()}>Try again</button></div>;
  return <div className={`app ${appearance === 'dark' ? 'dark-mode' : ''}`} style={{ '--bg-start': variant.base, '--bg-end': variant.end, '--ink': appearance === 'dark' ? '#f2f5ec' : variant.ink, '--panel': appearance === 'dark' ? '#18251f' : variant.surface, '--accent': variant.colors[0], '--accent-light': variant.colors[1], '--accent-dark': variant.colors[2], '--scene-image': `url('${sceneUrl}')`, '--scene-mobile-image': `url('${sceneUrl.replace('/backgrounds/', '/backgrounds/mobile/').replace('.jpg', '.webp')}')`, '--scene-preview-image': `url('${sceneUrl.replace('/backgrounds/', '/backgrounds/mobile/').replace('.jpg', '.webp')}')`, '--scene-position': `${15 + (variantIndex % 3) * 35}%`, '--scene-filter': `saturate(${.83 + variantIndex * .09}) contrast(${1 + variantIndex * .025}) brightness(${1.05 - variantIndex * .035})`, '--spin-hover': hoverColor } as React.CSSProperties}>
    <div className="bg-orb bg-orb-one" /><div className="bg-orb bg-orb-two" /><div className="bg-orb bg-orb-three" />
    <div className="page-wrap">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Tossup home"><span className="brand-icon"><span /></span><span>TOSSUP<span className="brand-period">.</span></span></a>
        <nav className="header-actions" aria-label="Main navigation">
          <button className="header-link help-link" onClick={() => setShowHelp(true)}><CircleHelp size={17} /> How it works</button>
          <button className="mode-toggle" onClick={() => setAppearance(appearance === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`} title={`${appearance === 'light' ? 'Dark' : 'Light'} mode`}>{appearance === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button>
          {user ? <div className="account-area"><span className="account-dot"/><span className="account-label">{user.email?.split('@')[0]}</span><button onClick={async () => { await supabase.auth.signOut(); setNotice('Signed out.'); }} className="header-link signout">Sign out</button></div> : unlocked && <button className="signin-btn" onClick={() => setAuthOpen(true)}>Sign in <ArrowRight size={16}/></button>}
        </nav>
      </header>

      <main>
        <div className="intro"><div className="eyebrow"><span className="eyebrow-line" /> YOUR DECISION, MADE EASY</div><h1>Can't decide? <em>Spin it.</em></h1><p>Add your choices. Give it a spin. Let chance do its thing.</p></div>
        <div className="workspace-grid">
          <section className="card options-card" aria-label="Your options">
            <div className="card-heading"><div><span className="section-kicker">01 / THE CHOICES</span><h2>Your options <span className="count-pill">{options.length}</span></h2></div><Settings2 size={20} strokeWidth={1.8}/></div>
            <div className="option-entry" ref={dropdownRef}>
              <label htmlFor="option-input">What goes on the wheel?</label>
              <div className="option-input-row"><div className="input-combo"><input id="option-input" value={draft} disabled={spinning} onChange={e => { setDraft(e.target.value); setDropdownOpen(true); }} onFocus={() => setDropdownOpen(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(draft); } if (e.key === 'Escape') setDropdownOpen(false); }} placeholder="Type or pick options..." maxLength={1024} autoComplete="off"/><button aria-label="Show suggested options" className="combo-toggle" disabled={spinning} onClick={() => setDropdownOpen(v => !v)}><ChevronDown size={17}/></button></div><button className="add-button" disabled={spinning} onClick={() => addOption(draft)} aria-label="Add option"><Plus size={22}/></button></div>
              <div className="input-hint">Separate choices with commas · empty entries are skipped</div>
              {dropdownOpen && <div className="suggestions-menu"><div className="dropdown-caption">QUICK IDEAS</div>{matchingSuggestions.slice(0, 8).map(s => <button key={s.id} onClick={() => addOption(`${draft.slice(0, draft.lastIndexOf(',') + 1)}${s.label}`)}>{s.label}<Plus size={14}/></button>)}{matchingSuggestions.length === 0 && <div className="dropdown-empty">Press Enter to add your own choice</div>}</div>}
            </div>
            <div className="quick-picks" ref={collectionRef}><div className="quick-picks-row"><button className="quick-picks-toggle" disabled={spinning} aria-expanded={collectionOpen} onClick={() => { setCollectionOpen(open => !open); setDropdownOpen(false); }}><Sparkles size={15}/> Quick presets <ChevronDown size={15}/></button><button className="surprise-button" disabled={spinning} onClick={() => loadCollection()}><Shuffle size={14}/> Surprise me</button></div>{collectionOpen && <div className="collections-menu">{[...new Set(collections.map(item => item.category))].map(category => <div className="collection-group" key={category}><div className="dropdown-caption">{category.toUpperCase()}</div>{collections.filter(item => item.category === category).map(item => <button key={item.id} onClick={() => loadCollection(item)}><span>{item.name}</span><small>{item.mode === 'random_names' ? 'New names each time' : `${item.options.length} choices`}</small></button>)}</div>)}</div>}</div>
            <div className="options-list" aria-live="polite">{options.map((option, i) => <div className="option-item" key={`${option}-${i}`}><span className="option-swatch" style={{ background: (wheelColors || variant.colors)[i % variant.colors.length] }}/><span className="option-text" title={option}>{option}</span><button aria-label={`Remove ${option}`} onClick={() => { setOptions(prev => prev.filter((_, n) => n !== i)); setResult(''); }} disabled={spinning}><X size={17}/></button></div>)}{options.length === 0 && <div className="empty-options">Nothing here yet. Add your first option above.</div>}</div>
            <div className="options-bottom"><span>{options.length} / 50 choices</span><button onClick={() => { setOptions([]); setResult(''); }} disabled={spinning || !options.length}><RotateCcw size={14}/> Clear all</button></div>
            {unlocked && <div className="presets-area"><div className="divider"/><div className="presets-heading"><span><Save size={16}/> SAVE YOUR WHEELS</span><span className="new-pill">NEW</span></div>{user ? <><div className="save-row"><input value={presetName} onChange={e => setPresetName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void savePreset(); }} placeholder="Name this wheel" maxLength={60} aria-label="Preset name"/><button onClick={() => void savePreset()} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div><button className="preset-dropdown-btn" onClick={() => setPresetOpen(v => !v)}>My saved wheels <span>{presets.length}</span><ChevronDown size={16}/></button>{presetOpen && <div className="preset-list">{presets.length ? presets.map(p => <div className="preset-item" key={p.id}><button onClick={() => { if (spinning) return; setOptions(p.options); setResult(''); setPresetOpen(false); setNotice(`Loaded ${p.name}.`); }}><span>{p.name}</span><small>{p.options.length} options</small></button><button className="delete-preset" aria-label={`Delete ${p.name}`} onClick={() => void deletePreset(p.id)}><Trash2 size={15}/></button></div>) : <div className="preset-empty">Your saved wheels will appear here.</div>}</div>}</> : <div className="save-unlock"><div>Like this wheel? Keep it for later.</div><button onClick={() => setAuthOpen(true)}>Sign in to save <ArrowRight size={15}/></button></div>}</div>}
          </section>

          <section className="wheel-column" aria-label="Spin the wheel"><div className={`wheel-stage animation-${animation} ${spinning ? 'is-spinning' : ''}`}><div className="stage-halo stage-halo-one"/><div className="stage-halo stage-halo-two"/><div className="wheel-topline"><span className="live-dot"/> THE DECISION MAKER <span className="topline-stars">✳ &nbsp;✳ &nbsp;✳</span></div>{animation === 'jackpot' ? <div className={`jackpot-machine ${spinning ? 'rolling' : ''}`} role="img" aria-label="Jackpot-style choice reels"><div className="jackpot-stars">✦ &nbsp; LUCKY PICK &nbsp; ✦</div><div className="reels">{reels.map((index, reel) => <div className="reel" key={reel}><span key={`${reel}-${index}`}>{options[index] || '✳'}</span></div>)}</div><div className="jackpot-bottom">✳ &nbsp; LET FATE DECIDE &nbsp; ✳</div></div> : <Wheel options={options} colors={wheelColors || variant.colors} dark={appearance === 'dark'} rotation={rotation} spinning={spinning} duration={spinDuration} easing={spinEasing}/>}<div className="stage-bottomline">GOOD THINGS HAPPEN BY CHANCE <span>✦</span></div></div>
            <div className="spin-controls"><button className="spin-button" onMouseEnter={() => { const n = crypto.getRandomValues(new Uint32Array(1))[0]; setHoverColor(variant.colors[n % variant.colors.length]); }} style={{ '--spin-hover': hoverColor } as React.CSSProperties} onClick={spin} disabled={spinning || options.length < 2}><span className="spin-button-content">{spinning ? <><span className="button-spinner"/> SPINNING...</> : <><Shuffle size={20} strokeWidth={2.5}/> {animation === 'jackpot' ? 'TRY YOUR LUCK' : 'SPIN THE WHEEL'} <ArrowRight size={21}/></>}</span></button><div className="spin-preferences"><div className="sound-control"><Volume2 size={17}/><label htmlFor="sound-select">Spin sound</label><select id="sound-select" value={sound} onChange={e => setSound(e.target.value as SoundMode)}><option value="classic">Classic tick</option><option value="soft">Soft pop</option><option value="arcade">Arcade</option><option value="chime">Chime</option><option value="off">Sound off</option></select><ChevronDown size={14}/></div><div className="sound-control"><Sparkles size={16}/><label htmlFor="animation-select">Animation</label><select id="animation-select" value={animation} disabled={spinning} onChange={e => { setAnimation(e.target.value); setResult(''); }}><option value="jackpot">Jackpot reels</option><option value="classic">Classic wheel</option><option value="turbo">Turbo spin</option><option value="reverse">Reverse spin</option><option value="bounce">Bounce</option><option value="glow">Neon glow</option><option value="suspense">Suspense</option></select><ChevronDown size={14}/></div></div></div>
            {notice && <div className="notice" role="alert">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15}/></button></div>}
          </section>

          <aside className="card theme-card" aria-label="Customize appearance"><div className="card-heading"><div><span className="section-kicker">02 / THE VIBE</span><h2>Make it yours</h2></div><Sparkles size={20} strokeWidth={1.8}/></div><div className="theme-label">PICK A THEME <span>9 STYLES</span></div><div className="theme-grid">{themes.map(t => <button key={t.id} className={`theme-tile ${theme.slug === t.slug ? 'active' : ''}`} onClick={() => setTheme(t.slug)} aria-label={`${t.name} theme`} aria-pressed={theme.slug === t.slug} style={{ '--tile-bg': t.variants[0].base, '--tile-accent': t.variants[0].colors[0], '--tile-image': `url('/backgrounds/thumb/${t.slug === 'terra' ? 'terracotta' : t.slug}${appearance === 'dark' ? '-dark' : ''}.webp')` } as React.CSSProperties}><span className="tile-art">{t.symbol}</span><span className="tile-name">{t.name}</span>{theme.slug === t.slug && <span className="tile-check"><Check size={11} strokeWidth={3}/></span>}</button>)}</div><div className="variant-area"><div className="theme-label">BACKGROUND <span>{appearance === 'dark' ? '5 NIGHT SCENES' : '6 LOOKS'}</span></div><div className="variant-preview"><div className="variant-preview-art" style={{ backgroundPosition: `${15 + (variantIndex % 3) * 35}% center`, filter: `saturate(${.83 + variantIndex * .09}) contrast(${1 + variantIndex * .025})` }} /><div className="variant-meta"><span>{variant.name}</span><small>{theme.name} / {variantIndex + 1} of {theme.variants.length}</small></div></div><div className="variant-controls"><button onClick={() => changeVariant(variantIndex - 1)} aria-label="Previous background"><ChevronLeft size={18}/></button><div className="variant-dots">{theme.variants.map((v, i) => <button key={v.name} className={variantIndex === i ? 'selected' : ''} onClick={() => changeVariant(i)} aria-label={`Choose ${v.name} background`} style={{ background: v.base }}/>)}</div><button onClick={() => changeVariant(variantIndex + 1)} aria-label="Next background"><ChevronRight size={18}/></button></div></div><div className="theme-foot"><Heart size={15}/> A little color changes everything.</div></aside>
        </div>
        <div className="bottom-strip"><span><span className="strip-star">✳</span> NO PRESSURE. JUST POSSIBILITIES.</span><span>{spins} SPINS & COUNTING</span></div>
        <div className="ad-banner-area"><AdSlot placement="leaderboard" size="970 × 90"/><AdSlot placement="mobile" size="320 × 100"/></div>
        <div className="below-workspace"><section className="seo-section"><div><span className="section-kicker">THE EASY WAY TO CHOOSE</span><h2>A random picker for the moments you can't decide.</h2></div><p>Tossup is a free online spin wheel and random choice picker. Add your own options or choose a quick idea, spin the wheel, and get a fair, random answer. Switch themes and backgrounds to make every decision a little more fun.</p></section><AdSlot placement="rectangle" size="300 × 250"/></div>
      </main>
      <footer><span className="footer-brand">TOSSUP<span>.</span></span><span>Make a choice. Make it fun.</span><div className="footer-links"><button onClick={() => setLegalOpen('privacy')}>Privacy policy</button><button onClick={() => setLegalOpen('terms')}>Terms of use</button><span>© {new Date().getFullYear()} Tossup</span></div></footer>
    </div>
    {result && !spinning && <div className="modal-backdrop result-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setResult(''); }}><div className={`result-popup result-effect-${resultMessage?.animation || 'pop'}`} role="dialog" aria-modal="true" aria-labelledby="result-title"><button className="result-close" onClick={() => setResult('')} aria-label="Close result"><X size={20}/></button><div className="result-confetti" aria-hidden="true"><span>✦</span><span>✳</span><span>✦</span><span>✳</span><span>✦</span></div><div className="result-badge">✳ &nbsp; THE WHEEL HAS SPOKEN &nbsp; ✳</div><p>{resultMessage?.message || 'And the wheel says...'}</p><h2 id="result-title">{result}</h2><div className="result-popup-actions"><button className="result-again" onClick={spin}><RotateCcw size={17}/> Spin again</button><button className="result-done" onClick={() => setResult('')}>Done <Check size={17}/></button></div></div></div>}
    {authOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={21}/></button><div className="modal-icon"><LockKeyhole size={23}/></div><span className="section-kicker">YOUR WHEELS, YOUR WAY</span><h2 id="auth-title">{authSignup ? 'Join the fun.' : 'Welcome back.'}</h2><p>Save your favorite wheels and pick up where you left off.</p><form onSubmit={e => void handleAuth(e)}><label>Email address<input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={authSignup ? 10 : 6} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={authSignup ? 'At least 10 characters' : 'Your password'}/></label>{authSignup && <label className="newsletter-optin"><input type="checkbox" checked={newsletterConsent} onChange={e => setNewsletterConsent(e.target.checked)}/><span>Optional: send me Tossup updates via beehiiv. Emails may include ads or partner offers. I can unsubscribe anytime.</span></label>}{authError && <div className="auth-error" role="alert">{authError}</div>}<button className="auth-submit" disabled={authBusy}>{authBusy ? 'One moment...' : authSignup ? 'Create account' : 'Sign in'} <ArrowRight size={17}/></button></form><div className="auth-or">OR</div><button className="google-button" onClick={() => { if (authSignup && newsletterConsent) sessionStorage.setItem('tossup-newsletter-pending', `google:${Date.now()}`); if (!signInWithGoogle('Tossup')) { sessionStorage.removeItem('tossup-newsletter-pending'); setAuthError('Google sign-in is unavailable right now. Please use email instead.'); } }}> <span className="google-g">G</span> Continue with Google</button><div className="auth-switch">{authSignup ? 'Already have an account?' : 'New around here?'} <button onClick={() => { setAuthSignup(!authSignup); setNewsletterConsent(false); setAuthError(''); }}>{authSignup ? 'Sign in' : 'Create an account'}</button></div><div className="auth-legal">By creating an account, you agree to our <button onClick={() => setLegalOpen('terms')}>Terms</button> and <button onClick={() => setLegalOpen('privacy')}>Privacy Policy</button>. Newsletter signup is never required.</div></div></div>}
    {showHelp && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowHelp(false); }}><div className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="modal-close" onClick={() => setShowHelp(false)} aria-label="Close"><X size={21}/></button><div className="modal-icon"><Sparkles size={24}/></div><span className="section-kicker">IT'S THIS SIMPLE</span><h2 id="help-title">Let the wheel decide.</h2><div className="help-steps"><div><span>01</span><p>Add at least two choices using the box or quick ideas dropdown.</p></div><div><span>02</span><p>Choose a theme, a background, and your favorite spin sound.</p></div><div><span>03</span><p>Press spin. After six spins or eleven options, sign in if you'd like to save your wheels.</p></div></div><button className="auth-submit" onClick={() => setShowHelp(false)}>Got it <ArrowRight size={17}/></button></div></div>}
    {legalOpen && <div className="modal-backdrop legal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLegalOpen(null); }}><div className="modal legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title"><button className="modal-close" onClick={() => setLegalOpen(null)} aria-label="Close"><X size={21}/></button><span className="section-kicker">TOSSUP / THE DETAILS</span><h2 id="legal-title">{legalOpen === 'privacy' ? 'Privacy policy' : 'Terms of use'}</h2><p className="legal-date">Effective September 24, 2026</p>{legalOpen === 'privacy' ? <div className="legal-copy">
      <h3>What we collect</h3><p>You can spin without an account. Your wheel options, theme, appearance, sound, animation and spin count are saved in this browser's local storage. If you create an account, our authentication provider Supabase processes your email, password credentials or Google sign-in data, and we store presets you choose to save with your account ID. We do not send your unsaved choices to our database.</p>
      <h3>Optional beehiiv newsletter</h3><p>Only if you tick the separate, unchecked newsletter box during sign-up, we send your verified account email to beehiiv to request a double opt-in subscription. beehiiv processes that email to deliver updates, which may include advertising, sponsorships or partner offers that support this site. You can decline without affecting your Tossup account, and unsubscribe through the link in any newsletter. We record your consent and subscription status to avoid duplicate requests. If newsletter integration is unavailable, we do not send your email to beehiiv.</p>
      <h3>Other services and controls</h3><p>Our hosting and preview environment may process technical usage information and interaction analytics. Our reserved ad spaces can display ads from Google AdSense or Monetag once configured. Those providers may process device information, IP address, cookies and ad interactions under their own policies; any legally required consent mechanism must be enabled by the site operator before ad tracking is activated. We use Supabase for account and preset storage and Google only when you choose Google sign-in. Remove saved presets in the app, clear local storage in your browser, or unsubscribe from emails using beehiiv's email link. Do not enter sensitive personal information as wheel options.</p>
    </div> : <div className="legal-copy">
      <h3>Using Tossup</h3><p>Tossup is a free decision-making tool for personal use. You may use it without an account; an account lets you save presets. Keep your account credentials private and provide accurate sign-up information. Do not use the service to break laws, abuse the service or interfere with other users.</p>
      <h3>Random results and availability</h3><p>Spins are for casual decisions and entertainment, not gambling, financial, medical, legal or other high-stakes decisions. We do not guarantee a particular result, uninterrupted access, or that stored data will always be available. You remain responsible for decisions made using the site.</p>
      <h3>Optional newsletter and monetization</h3><p>Joining the beehiiv newsletter is optional and separate from account creation. Newsletter emails may contain ads, sponsorships or partner offers. No purchase is required to spin or save eligible presets. You can unsubscribe using the link in a newsletter without deleting your Tossup account. Ad placements on the website may help fund the service. We may update the service and these terms; continued use after updates means you accept the revised terms.</p>
    </div>}<button className="auth-submit" onClick={() => setLegalOpen(null)}>Close <Check size={17}/></button></div></div>}
  </div>;
}
export default App;
