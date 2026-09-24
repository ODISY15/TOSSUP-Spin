import { useMemo, useState } from 'react';
import { themeCatalog, suggestionCatalog, optionCollections, resultMessages, backgroundFor } from './lib/staticData';
import './index.css';
import './enhancements.css';

type Variant = { name: string; base: string; end: string; ink: string; surface: string; colors: string[] };
type Theme = { id: number; slug: string; name: string; symbol: string; variants: Variant[] };

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage restrictions.
  }
};

function App() {
  const [themeSlug, setThemeSlug] = useState(() => readStored('tossup-theme', 'sunroom'));
  const [variantIndex, setVariantIndex] = useState(() => readStored('tossup-variant', 0));
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => readStored('tossup-appearance', 'light'));
  const [draft, setDraft] = useState('');
  const [options, setOptions] = useState<string[]>(() => readStored('tossup-options', suggestionCatalog.slice(0, 6).map((item) => item.label)));
  const [result, setResult] = useState('');
  const [notice, setNotice] = useState('');

  const theme = useMemo(() => {
    return themeCatalog.find((item) => item.slug === themeSlug) || themeCatalog[0];
  }, [themeSlug]);

  const variant = theme.variants[Math.min(Math.max(variantIndex, 0), theme.variants.length - 1)];
  const wheelColors = appearance === 'dark'
    ? variant.colors.map((hex) => {
        const red = Number.parseInt(hex.slice(1, 3), 16);
        const green = Number.parseInt(hex.slice(3, 5), 16);
        const blue = Number.parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.round(red * 0.42 + 9)}, ${Math.round(green * 0.42 + 18)}, ${Math.round(blue * 0.42 + 21)})`;
      })
    : variant.colors;

  const sceneUrl = backgroundFor(themeSlug, variantIndex, appearance);

  const addOption = () => {
    const entries = draft
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!entries.length) {
      setNotice('Add at least one option.');
      return;
    }

    const next = [...options];
    for (const entry of entries) {
      if (!next.some((item) => item.toLowerCase() === entry.toLowerCase())) {
        next.push(entry);
      }
    }
    setOptions(next);
    setDraft('');
    setNotice('');
    saveStored('tossup-options', next);
  };

  const spin = () => {
    if (options.length < 2) {
      setNotice('Add at least two options to spin.');
      return;
    }

    const winner = options[Math.floor(Math.random() * options.length)];
    setResult(winner);
    setNotice('');
  };

  const removeOption = (value: string) => {
    const next = options.filter((item) => item !== value);
    setOptions(next);
    saveStored('tossup-options', next);
  };

  const chooseTheme = (slug: string) => {
    setThemeSlug(slug);
    setVariantIndex(0);
    saveStored('tossup-theme', slug);
    saveStored('tossup-variant', 0);
  };

  const cycleVariant = () => {
    const next = (variantIndex + 1) % theme.variants.length;
    setVariantIndex(next);
    saveStored('tossup-variant', next);
  };

  useMemo(() => {
    saveStored('tossup-appearance', appearance);
    document.documentElement.style.colorScheme = appearance;
  }, [appearance]);

  return (
    <div
      className={`app ${appearance === 'dark' ? 'dark-mode' : ''}`}
      style={{
        '--bg-start': variant.base,
        '--bg-end': variant.end,
        '--ink': appearance === 'dark' ? '#f2f5ec' : variant.ink,
        '--surface': variant.surface,
        '--bg-image': `url(${sceneUrl})`,
        background: `linear-gradient(135deg, ${variant.base}, ${variant.end})`,
      }}
    >
      <div className="bg-orb bg-orb-one" />
      <div className="bg-orb bg-orb-two" />
      <div className="bg-orb bg-orb-three" />

      <div className="page-wrap">
        <header className="site-header">
          <div className="brand">
            <span className="brand-icon"><span /></span>
            <span>TOSSUP<span className="brand-period">.</span></span>
          </div>

          <div className="header-actions">
            <button className="mode-toggle" onClick={() => setAppearance((prev) => (prev === 'light' ? 'dark' : 'light'))}>
              {appearance === 'light' ? 'Dark' : 'Light'} mode
            </button>
          </div>
        </header>

        <main>
          <div className="intro">
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR DECISION, MADE EASY</div>
            <h1>Can&apos;t decide? <em>Spin it.</em></h1>
            <p>Add your choices. Pick a theme. Let the wheel decide.</p>
          </div>

          <div className="workspace-grid">
            <section className="card options-card" aria-label="Your options">
              <div className="card-heading">
                <div>
                  <span className="section-kicker">01 / THE CHOICES</span>
                  <h2>Your options <span className="count-pill">{options.length}</span></h2>
                </div>
              </div>

              <div className="option-entry">
                <label htmlFor="option-input">What goes on the wheel?</label>
                <div className="option-input-row">
                  <div className="input-combo">
                    <input id="option-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="coffee, tea, matcha" />
                    <button onClick={addOption}>Add</button>
                  </div>
                </div>
                <div className="input-hint">Separate choices with commas</div>
              </div>

              <div className="options-list">
                {options.map((option, index) => (
                  <div className="option-item" key={`${option}-${index}`}>
                    <span className="option-swatch" style={{ background: wheelColors[index % wheelColors.length] }} />
                    <span>{option}</span>
                    <button className="mini-button" onClick={() => removeOption(option)} aria-label={`Remove ${option}`}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="wheel-column" aria-label="Spin the wheel">
              <div className="wheel-stage" style={{ backgroundImage: `url(${sceneUrl})` }}>
                <div className="stage-halo" />
                <div className="wheel-shell">
                  <div className="wheel-outer-ring" />
                  <div className="wheel-pointer" aria-hidden="true"><div /></div>
                  <svg className="wheel-svg" viewBox="0 0 400 400" role="img" aria-label={`Spinner wheel with ${options.length} options`}>
                    {options.map((option, i) => {
                      const total = Math.max(options.length, 1);
                      const step = 360 / total;
                      const start = i * step;
                      const end = (i + 1) * step;
                      const radius = 196;
                      const center = start + step / 2;
                      const a = { x: 200 + radius * Math.cos((start - 90) * Math.PI / 180), y: 200 + radius * Math.sin((start - 90) * Math.PI / 180) };
                      const b = { x: 200 + radius * Math.cos((end - 90) * Math.PI / 180), y: 200 + radius * Math.sin((end - 90) * Math.PI / 180) };
                      const path = `M 200 200 L ${a.x} ${a.y} A ${radius} ${radius} 0 ${step > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
                      const pos = {
                        x: 200 + (options.length > 14 ? 127 : 122) * Math.cos(((center - 90) * Math.PI) / 180),
                        y: 200 + (options.length > 14 ? 127 : 122) * Math.sin(((center - 90) * Math.PI) / 180),
                      };
                      const label = option.length > 18 ? `${option.slice(0, 17)}…` : option;
                      return (
                        <g key={`${option}-${i}`}>
                          <path d={path} fill={wheelColors[i % wheelColors.length]} stroke="rgba(255,255,255,.35)" strokeWidth="1.8" />
                          <text x={pos.x} y={pos.y} transform={`rotate(${center - 9} ${pos.x} ${pos.y})`} textAnchor="middle" fontSize={options.length > 18 ? 10 : 12} fill={appearance === 'dark' ? '#f6f6f2' : '#1a231d'}>
                            {label}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx="200" cy="200" r="18" fill="#ffffff" stroke="rgba(25,40,37,.09)" strokeWidth="3" />
                    <circle cx="200" cy="200" r="7" fill="#15221f" />
                  </svg>
                </div>
              </div>

              <div className="spin-controls">
                <button className="spin-button" onClick={spin}>Spin</button>
              </div>
              {notice && <div className="notice" role="alert">{notice}</div>}
              {result && <div className="result-popup">Winner: {result}</div>}
            </section>

            <aside className="card theme-card" aria-label="Customize appearance">
              <div className="card-heading">
                <div>
                  <span className="section-kicker">02 / THE VIBE</span>
                  <h2>Make it yours</h2>
                </div>
              </div>

              <div className="theme-list">
                {themeCatalog.map((item) => (
                  <button
                    key={item.slug}
                    className={`theme-option ${item.slug === themeSlug ? 'active' : ''}`}
                    onClick={() => chooseTheme(item.slug)}
                    type="button"
                  >
                    <span className="theme-symbol">{item.symbol}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>

              <div className="variant-row">
                <button className="mini-button" onClick={cycleVariant}>Variant {variantIndex + 1}</button>
              </div>

              <div className="theme-preview" style={{ background: `linear-gradient(135deg, ${variant.base}, ${variant.end})` }} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
