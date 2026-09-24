export type SoundMode = 'off' | 'classic' | 'soft' | 'arcade' | 'chime';
let context: AudioContext | null = null;
function audio() { if (!context) context = new AudioContext(); if (context.state === 'suspended') void context.resume(); return context; }
function note(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  const ctx = audio();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + 0.01);
}
export function playTick(mode: SoundMode) {
  try {
    if (mode === 'classic') note(740, .035, 'square', .025);
    if (mode === 'soft') note(520, .07, 'sine', .022);
    if (mode === 'arcade') note(380, .05, 'triangle', .04);
    if (mode === 'chime') note(890, .12, 'sine', .014);
  } catch { /* Audio unavailable */ }
}
export function playWin(mode: SoundMode) {
  try {
    if (mode === 'off') return;
    if (mode === 'classic') { note(660, .16, 'sine', .09); note(880, .3, 'sine', .08, .14); }
    if (mode === 'soft') { note(523, .3, 'sine', .06); note(784, .48, 'sine', .06, .18); }
    if (mode === 'arcade') { note(523, .12, 'square', .045); note(659, .12, 'square', .045, .13); note(1046, .3, 'square', .045, .26); }
    if (mode === 'chime') { note(659, .55, 'sine', .07); note(987, .75, 'sine', .05, .1); note(1318, .9, 'sine', .04, .22); }
  } catch { /* Audio unavailable */ }
}
