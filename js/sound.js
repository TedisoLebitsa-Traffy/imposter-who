/* ============================================================
   Sound — synthesised via Web Audio (no audio files).
   Four cues: drumroll, imposterCaught, innocentLost, winner.

   Wrapped behind a small module so recorded clips can replace
   the synth versions later without touching game logic. To swap
   in real audio, give each cue an `clip` URL and play it from
   the same method names — game code only ever calls Sound.play(name).
   ============================================================ */

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function engine() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    // Browsers start the context suspended until a user gesture.
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /** One oscillator note. */
  function tone(freq, start, dur, type = "sine", vol = 0.2) {
    const c = engine();
    if (!c) return;
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst — used for the drumroll body. */
  function hit(start, dur = 0.07, vol = 0.18) {
    const c = engine();
    if (!c) return;
    const t0 = c.currentTime + start;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getData ? buf.getData(0) : buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = vol;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    src.connect(lp); lp.connect(gain); gain.connect(c.destination);
    src.start(t0);
  }

  const cues = {
    drumroll() {
      // Classic snare roll: a steady buzz that accelerates and swells
      // over 3 seconds, then lands on a final accent.
      const total = 3.0;
      let t = 0;
      while (t < total - 0.04) {
        const p = t / total;               // 0 → 1 over the roll
        const interval = 0.06 - p * 0.028;  // accelerate: ~17 → ~30 hits/sec
        const vol = 0.07 + p * 0.15;        // crescendo
        hit(t, 0.045, vol);
        t += interval;
      }
      // landing accent on the verdict
      hit(total, 0.14, 0.32);
      tone(90, total, 0.3, "square", 0.18);
    },
    imposterCaught() {
      // Sharp, dramatic sting.
      tone(440, 0, 0.1, "sawtooth", 0.22);
      tone(330, 0.1, 0.12, "sawtooth", 0.22);
      tone(247, 0.24, 0.45, "sawtooth", 0.22);
    },
    innocentLost() {
      // Softer, deflating descent.
      tone(330, 0, 0.18, "sine", 0.2);
      tone(247, 0.16, 0.22, "sine", 0.2);
      tone(165, 0.36, 0.5, "sine", 0.2);
    },
    winner() {
      // Short rising fanfare.
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.32, "triangle", 0.2));
      tone(1319, 0.48, 0.5, "triangle", 0.18);
    },
  };

  return {
    play(name) {
      if (muted) return;
      const cue = cues[name];
      if (cue) cue();
    },
    setMuted(v) { muted = !!v; },
    isMuted() { return muted; },
    /** Call from a user gesture to unlock audio on mobile. */
    unlock() { engine(); },
  };
})();
