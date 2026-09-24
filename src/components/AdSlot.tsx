import { useEffect, useRef } from 'react';

type Placement = 'leaderboard' | 'mobile' | 'rectangle';
type AdWindow = Window & { adsbygoogle?: Record<string, unknown>[] };

const client = import.meta.env.VITE_ADSENSE_CLIENT_ID || '';
const provider = import.meta.env.VITE_AD_PROVIDER || 'adsense';
const slotIds: Record<Placement, string> = {
  leaderboard: import.meta.env.VITE_ADSENSE_LEADERBOARD_SLOT || '',
  mobile: import.meta.env.VITE_ADSENSE_MOBILE_SLOT || '',
  rectangle: import.meta.env.VITE_ADSENSE_RECTANGLE_SLOT || '',
};
const monetagZones: Record<Placement, string> = {
  leaderboard: import.meta.env.VITE_MONETAG_LEADERBOARD_ZONE || '',
  mobile: import.meta.env.VITE_MONETAG_MOBILE_ZONE || '',
  rectangle: import.meta.env.VITE_MONETAG_RECTANGLE_ZONE || '',
};

function ensureAdSenseScript() {
  if (document.querySelector('script[data-tossup-adsense]')) return;
  const script = document.createElement('script');
  script.dataset.tossupAdsense = 'true';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(script);
}

/** Publisher setup: set VITE_AD_PROVIDER=adsense plus a client and one ad-unit ID per placement.
 * For Monetag, set VITE_AD_PROVIDER=monetag and zone IDs, then have your approved
 * publisher tag listen for `tossup:monetag-slot` and render into detail.element.
 * Publisher scripts are intentionally not injected from untrusted URLs.
 */
export default function AdSlot({ placement, size }: { placement: Placement; size: string }) {
  const container = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const adsenseReady = provider === 'adsense' && /^ca-pub-\d+$/.test(client) && /^\d+$/.test(slotIds[placement]);
  const monetagReady = provider === 'monetag' && /^[A-Za-z0-9_-]{4,80}$/.test(monetagZones[placement]);

  useEffect(() => {
    const element = container.current;
    if (!element || (!adsenseReady && !monetagReady)) return;
    const initialize = () => {
      if (initialized.current || element.offsetWidth === 0) return;
      initialized.current = true;
      if (adsenseReady) {
        ensureAdSenseScript();
        try { ((window as AdWindow).adsbygoogle = (window as AdWindow).adsbygoogle || []).push({}); }
        catch (error) { console.error('Ad unit could not initialize:', error); }
      } else {
        window.dispatchEvent(new CustomEvent('tossup:monetag-slot', {
          detail: { placement, zoneId: monetagZones[placement], element },
        }));
      }
    };
    if (typeof IntersectionObserver === 'undefined') { initialize(); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      initialize();
      observer.disconnect();
    }, { rootMargin: '250px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [placement, adsenseReady, monetagReady]);

  return <div ref={container} className={`ad-unit ad-unit-${placement}`} role="complementary" aria-label={`Advertisement ${size}`} data-ad-provider={provider} data-ad-placement={placement} data-ad-size={size} data-monetag-zone={monetagReady ? monetagZones[placement] : undefined}>
    <span className="ad-unit-label">ADVERTISEMENT</span>
    {adsenseReady ? <ins className="adsbygoogle" style={{ display: 'block', width: '100%', height: '100%' }} data-ad-client={client} data-ad-slot={slotIds[placement]} data-ad-format={placement === 'rectangle' ? 'rectangle' : 'horizontal'} /> : monetagReady ? null : <span className="ad-unit-size" aria-hidden="true">{size}</span>}
  </div>;
}
