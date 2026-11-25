// Every sound is synthesised with WebAudio — no audio files, nothing fetched.
// A short blip for picking up, a thock for the knife, a hiss while the grill
// runs, a little arpeggio for a served dish and a low buzz for a mistake.
export function createSound() {
  let context = null;
  let master = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const start = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + dur);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (sizzle !== null) sizzle.gain.value = muted ? 0 : 0.05;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(620, 0.07, 'square', 0.12);
    },
    putdown() {
      tone(420, 0.07, 'square', 0.1);
    },
    chop() {
      noise(0.09, 0.25, 900);
      tone(180, 0.06, 'triangle', 0.18, 0, 120);
    },
    chopDone() {
      tone(740, 0.09, 'sine', 0.16);
      tone(988, 0.12, 'sine', 0.16, 0.09);
    },
    grillDone() {
      tone(660, 0.1, 'sine', 0.16);
      tone(880, 0.14, 'sine', 0.16, 0.1);
    },
    serve(combo) {
      const base = 523 + Math.min(combo, 8) * 24;
      tone(base, 0.12, 'triangle', 0.2);
      tone(base * 1.25, 0.12, 'triangle', 0.2, 0.1);
      tone(base * 1.5, 0.2, 'triangle', 0.22, 0.2);
    },
    fail() {
      tone(160, 0.25, 'sawtooth', 0.16, 0, 110);
    },
    tick() {
      tone(1050, 0.04, 'square', 0.08);
    },
    bell() {
      tone(1180, 0.35, 'sine', 0.18);
      tone(1568, 0.3, 'sine', 0.1, 0.02);
    },
    dayDone() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.18, i * 0.13));
    },
    // A soft hiss that runs while anything is on the grill, and stops when it is empty.
    setSizzle(on) {
      const ctx = ensure();
      if (ctx === null) return;
      if (on && sizzle === null) {
        const length = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3200;
        const gain = ctx.createGain();
        gain.gain.value = muted ? 0 : 0.045;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        source.start();
        sizzle = { source, gain };
      } else if (!on && sizzle !== null) {
        try {
          sizzle.source.stop();
        } catch {
          // Already stopped.
        }
        sizzle = null;
      }
    },
  };
}
