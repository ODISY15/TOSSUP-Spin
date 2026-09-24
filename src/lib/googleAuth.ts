import supabase from './supabase';

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function buildGoogleUrl(appName: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_AUTH_PROXY;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!clientId || !redirectUri) return null;
  const state = btoa(JSON.stringify({ origin: window.location.origin, appName, supabaseUrl, supabaseAnonKey }));
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(state)}`;
}
export function signInWithGoogle(appName = 'Tossup') {
  const url = buildGoogleUrl(appName);
  if (!url) return false;
  const popup = window.open(url, 'google-auth', isMobile() ? '' : 'width=500,height=600');
  if (!popup) return false;
  const expectedOrigin = new URL(import.meta.env.VITE_GOOGLE_AUTH_PROXY).origin;
  const handler = async (event: MessageEvent) => {
    if (event.origin !== expectedOrigin || event.source !== popup) return;
    if (event.data?.type === 'google-auth-denied') { window.removeEventListener('message', handler); return; }
    if (event.data?.type !== 'google-auth-success') return;
    window.removeEventListener('message', handler);
    if (event.data.access_token && event.data.refresh_token) {
      await supabase.auth.setSession({ access_token: event.data.access_token, refresh_token: event.data.refresh_token });
    } else if (event.data.id_token) {
      await supabase.auth.signInWithIdToken({ provider: 'google', token: event.data.id_token });
    }
  };
  window.addEventListener('message', handler);
  return true;
}
export async function handleGoogleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('google_id_token');
  if (!token) return;
  window.history.replaceState({}, '', window.location.pathname);
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
  if (!error) { try { window.close(); } catch { /* ignored */ } }
}
