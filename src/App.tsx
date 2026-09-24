import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { backgroundFor, suggestionCatalog, themeCatalog } from './lib/staticData';
import './index.css';
import './enhancements.css';

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const saveStored = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
};

const point = (angle: number, radius: number) => ({
  x: 200 + radius * Math.cos((angle - 90) * Math.PI / 180),
  y: 200 + radius * Math.sin((angle - 90) * Math.PI / 180),
});

function Wheel({ options, colors, rotation, spinning, dark }: { options: string[]; colors: string[]; rotation: number; spinning: boolean; dark: boolean }) {
  const step = 360 / Math.max(options.length, 1);
  const fontSize = options.length > 18 ? 10 : options.length > 12 ? 12 : options.length > 8 ? 14 : 17;

  return <div className="wheel-shell">
    <div className="wheel-outer-ring" />
    <div className="wheel-pointer" aria-hidden="true"><div /></div>
    <svg className="wheel-svg" viewBox="0 0 400 400" role="img" aria-label={`Spinner wheel with ${options.length} options`} style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.5s cubic-bezier(.12,.78,.08,1)' : 'none' }}>
      <circle cx="200" cy="200" r="198" fill={colors[0]} />
      {options.map((option, i) => {
        const start = i * step;
        const end = (i + 1) * step;
        const a = point(start, 196);
        const b = point(end, 196);
        const center = start + step / 2;
        const pos = point(center, options.length > 14 ? 127 : 122);
        const path = `M 200 200 L ${a.x} ${a.y} A 196 196 0 ${step > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
        const label = option.length > (options.length > 10 ? 13 : 18) ? `${option.slice(0, options.length > 10 ? 12 : 17)}…` : option;
        return <g key={`${option}-${i}`}>
          <path d={path} fill={colors[i % colors.length]} stroke="rgba(255,255,255,.35)" strokeWidth="1.8" />
          <text x={pos.x} y={pos.y} transform={`rotate(${center - 90} ${pos.x} ${pos.y})`} textAnchor="middle" fontSize={fontSize} fill={dark ? '#f6f6f2' : '#172622'}>{label}</text>
        </g>;
      })}
      <circle cx="200" cy="200" r="18" fill="#fff" stroke="rgba(25,40,37,.09)" strokeWidth="3" />
      <circle cx="200" cy="200" r="7" fill="#15221f" />
      <circle cx="200" cy="200" r="198" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="5" />
    </svg>
  </div>;
}

function App() {
  const [themeSlug, setThemeSlug] = useState(() => readStored('tossup-theme', 'sunroom'));
  const [variantIndex, setVariantIndex] = useState(() => readStored('tossup-variant', 0));
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => readStored('tossup-appearance', 'light'));
  const [options, setOptions] = useState<string[]>(() => readStored('tossup-options', suggestionCatalog.slice(0, 6).map(item => item.label)));
  const [draft, setDraft] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState('');
  const [notice, setNotice] = useState('');

  const theme = useMemo(() => themeCatalog.find(item => item.slug === themeSlug) || themeCatalog[0], [themeSlug]);
  const variant = theme.variants[variantIndex % theme.variants.length];
  const sceneUrl = backgroundFor(theme.slug, variantIndex, appearance);
  const wheelColors = appearance === 'dark' ? variant.colors.map(hex => {
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(red * .42 + 9)}, ${Math.round(green * .42 + 18)}, ${Math.round(blue * .42 + 21)})`;
  }) : variant.colors;

  useEffect(() => {
    saveStored('tossup-theme', themeSlug);
    saveStored('tossup-variant', variantIndex);
    saveStored('tossup-appearance', appearance);
    saveStored('tossup-options', options);
    document.documentElement.style.colorScheme = appearance;
  }, [themeSlug, variantIndex, appearance, options]);

  const addOptions = () => {
    const entries = draft.split(',').map(item => item.trim()).filter(Boolean);
    const unique = entries.filter(entry => !options.some(item => item.toLowerCase() === entry.toLowerCase()));
    if (!unique.length) { setNotice('Add a new choice first.'); return; }
    if (options.length + unique.length > 50) { setNotice('You can have up to 50 choices.'); return; }
    setOptions(current => [...current, ...unique]);
    setDraft('');
    setNotice('');
  };

  const spin = () => {
    if (spinning) return;
    if (options.length < 2) { setNotice('Add at least two options to spin.'); return; }
    const winner = Math.floor(Math.random() * options.length);
    const step = 360 / options.length;
    const current = ((rotation % 360) + 360) % 360;
    const target = (360 - (winner + .5) * step) % 360;
    setRotation(current => current + ((target - current + 360) % 360) + 360 * 7);
    setSpinning(true);
    setResult('');
    setNotice('');
    window.setTimeout(() => { setSpinning(false); setResult(options[winner]); }, 4600);
  };

  const style: ThemeStyle = {
    '--bg-start': variant.base,
    '--bg-end': variant.end,
    '--ink': appearance === 'dark' ? '#f2f5ec' : variant.ink,
    '--panel': variant.surface,
    '--scene-image': `url("${sceneUrl}")`,
    '--scene-filter': appearance === 'dark' ? 'brightness(.42) saturate(.9)' : 'brightness(.88) saturate(.92)',
    background: `linear-gradient(135deg, ${variant.base}, ${variant.end})`,
  };

  return <div className={`app ${appearance === 'dark' ? 'dark-mode' : ''}`} style={style}>
    <div className="page-wrap">
      <header className="site-header">
        <div className="brand" aria-label="Tossup home"><span className="brand-icon"><span /></span><span>TOSSUP<span className="brand-period">.</span></span></div>
        <nav className="header-actions" aria-label="Appearance controls">
          <button className="mode-toggle" onClick={() => setAppearance(mode => mode === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`}>{appearance === 'light' ? 'Dark' : 'Light'}</button>
        </nav>
      </header>

      <main>
        <div className="intro"><div className="eyebrow"><span className="eyebrow-line" /> YOUR DECISION, MADE EASY</div><h1>Can&apos;t decide? <em>Spin it.</em></h1><p>Add your choices. Pick a vibe. Let the wheel decide.</p></div>
        <div className="workspace-grid">
          <section className="card options-card" aria-label="Your options">
            <div className="card-heading"><div><span className="section-kicker">01 / THE CHOICES</span><h2>Your options <span className="count-pill">{options.length}</span></h2></div></div>
            <div className="option-entry"><label htmlFor="option-input">What goes on the wheel?</label><div className="option-input-row"><div className="input-combo"><input id="option-input" value={draft} disabled={spinning} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addOptions(); }} placeholder="coffee, tea, matcha" /><button className="add-button" onClick={addOptions}>Add</button></div></div><div className="input-hint">Separate choices with commas · empty entries are skipped</div></div>
            <div className="options-list" aria-live="polite">{options.map((option, index) => <div className="option-item" key={`${option}-${index}`}><span className="option-swatch" style={{ background: wheelColors[index % wheelColors.length] }} /><span>{option}</span><button className="mini-button" onClick={() => setOptions(current => current.filter(item => item !== option))}>Remove</button></div>)}</div>
            <div className="options-bottom"><span>{options.length} / 50 choices</span><button className="mini-button" onClick={() => setOptions([])} disabled={!options.length}>Clear</button></div>
          </section>

          <section className="wheel-column" aria-label="Spin the wheel">
            <div className={`wheel-stage ${spinning ? 'is-spinning' : ''}`} style={{ backgroundImage: `url("${sceneUrl}")` }}><div className="stage-halo" /><Wheel options={options} colors={wheelColors} rotation={rotation} spinning={spinning} dark={appearance === 'dark'} /></div>
            <div className="spin-controls"><button className="spin-button" onClick={spin} disabled={spinning || options.length < 2}>Spin</button></div>
            {notice && <div className="notice" role="alert">{notice}</div>}
            {result && !spinning && <div className="result-popup" role="status"><span className="result-badge">THE WHEEL SAYS</span><h2>{result}</h2><button className="result-again" onClick={() => setResult('')}>Spin again</button></div>}
          </section>

          <aside className="card theme-card" aria-label="Customize appearance"><div className="card-heading"><div><span className="section-kicker">02 / THE VIBE</span><h2>Make it yours</h2></div></div><div className="theme-grid">{themeCatalog.map(item => <button key={item.slug} type="button" className={`theme-tile ${item.slug === theme.slug ? 'active' : ''}`} onClick={() => { setThemeSlug(item.slug); setVariantIndex(0); }} style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.25), rgba(0,0,0,0)), url("${item.backgrounds[0]}")` }}><span className="tile-icon">{item.symbol}</span><span className="tile-name">{item.name}</span>{item.slug === theme.slug && <span className="tile-check">✓</span>}</button>)}</div><div className="variant-controls"><button className="mini-button" onClick={() => setVariantIndex(index => (index + 1) % 6)}>Next photo {variantIndex + 1}/6</button></div></aside>
        </div>
      </main>
    </div>
  </div>;
}

export default App;
