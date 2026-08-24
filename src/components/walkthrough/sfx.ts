// Lightweight WebAudio SFX synth — no assets, no deps.
let ctx: AudioContext | null = null;
let muted = true;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export function resumeSfx() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setSfxMuted(m: boolean) {
  muted = m;
  if (masterGain && ctx) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(m ? 0 : 0.5, ctx.currentTime);
  }
}

function envGain(c: AudioContext, attack: number, decay: number, peak: number) {
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function tone(freq: number, type: OscillatorType, attack: number, decay: number, peak = 0.3) {
  const c = getCtx();
  if (!c || muted || !masterGain) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = envGain(c, attack, decay, peak);
  o.connect(g).connect(masterGain);
  const t = c.currentTime;
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noiseBurst(duration: number, filterFreq: number, peak = 0.25, sweepTo?: number) {
  const c = getCtx();
  if (!c || muted || !masterGain) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = filterFreq;
  filt.Q.value = 0.8;
  if (sweepTo) filt.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + duration);
  const g = envGain(c, 0.04, duration, peak);
  src.connect(filt).connect(g).connect(masterGain);
  src.start();
  src.stop(c.currentTime + duration + 0.1);
}

export function chime() {
  tone(880, "sine", 0.02, 1.2, 0.22);
  setTimeout(() => tone(1320, "sine", 0.02, 1.0, 0.18), 40);
  setTimeout(() => tone(1760, "sine", 0.02, 0.9, 0.14), 90);
}

export function whoosh() {
  noiseBurst(0.6, 600, 0.22, 2400);
}

export function click() {
  tone(1200, "triangle", 0.005, 0.08, 0.25);
  noiseBurst(0.05, 3000, 0.12);
}

export function pop() {
  [1568, 2093, 2637, 3136].forEach((f, i) =>
    setTimeout(() => tone(f, "sine", 0.01, 0.3, 0.18), i * 60),
  );
}

export function ding() {
  tone(1318, "sine", 0.01, 0.9, 0.24);
  setTimeout(() => tone(1975, "sine", 0.01, 0.8, 0.16), 30);
}

export function swell() {
  const c = getCtx();
  if (!c || muted || !masterGain) return;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(110, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(440, c.currentTime + 1.6);
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(400, c.currentTime);
  filt.frequency.exponentialRampToValueAtTime(4000, c.currentTime + 1.6);
  const g = envGain(c, 0.2, 1.6, 0.18);
  o.connect(filt).connect(g).connect(masterGain);
  o.start();
  o.stop(c.currentTime + 1.9);
  noiseBurst(1.6, 800, 0.08, 3000);
}
