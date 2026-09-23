// Sounds synthesised with WebAudio, so the app ships no audio files.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

export function createSound() {
  let ctx = null;
  let master = null;
  let enabled = true;
  let volume = 0.4;

  function ensure() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = volume;
    return ctx;
  }

  function tone(freq, { at = 0, dur = 1.2, gain = 0.3, type = 'sine', pan = 0 } = {}) {
    const c = ensure();
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(g).connect(p).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    configure({ sound, volume: v }) {
      enabled = !!sound;
      volume = v;
      if (master) master.gain.value = volume;
    },
    // Little bell when charms touch; louder for harder hits.
    chime(strength = 0.5, pan = 0) {
      if (!enabled) return;
      const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      tone(f, { gain: 0.08 + 0.2 * strength, dur: 1.4, pan });
      tone(f * 2.76, { gain: 0.03 + 0.06 * strength, dur: 0.6, pan });
    },
    tick(pan = 0) {
      if (!enabled) return;
      tone(1800, { gain: 0.05, dur: 0.08, type: 'triangle', pan });
    },
    whoosh(strength = 0.5, pan = 0) {
      if (!enabled) return;
      const c = ensure();
      const len = 0.35;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / d.length);
      const src = c.createBufferSource();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      const p = c.createStereoPanner();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(500, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(1800, c.currentTime + len);
      g.gain.value = 0.12 * strength;
      p.pan.value = pan;
      src.buffer = buf;
      src.connect(f).connect(g).connect(p).connect(master);
      src.start();
    },
    reminder() {
      if (!enabled) return;
      tone(783.99, { gain: 0.18, dur: 0.9 });
      tone(1046.5, { at: 0.14, gain: 0.18, dur: 1.2 });
    },
  };
}
