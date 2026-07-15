let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Premium two-tone chime - like a banking app notification
    const notes = [
      { freq: 659.25, start: 0, dur: 0.12 },     // E5
      { freq: 783.99, start: 0.06, dur: 0.12 },   // G5
      { freq: 987.77, start: 0.14, dur: 0.18 },   // B5 (peak)
      { freq: 1318.51, start: 0.22, dur: 0.22 },  // E6 (ring out)
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.14);
    masterGain.gain.linearRampToValueAtTime(0.14, now + 0.22);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      noteGain.gain.setValueAtTime(0, now + start);
      noteGain.gain.linearRampToValueAtTime(1, now + start + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });

    // Add a soft harmonic undertone for richness
    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = "sine";
    pad.frequency.setValueAtTime(329.63, now); // E4 undertone
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.04, now + 0.1);
    padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    pad.connect(padGain);
    padGain.connect(masterGain);
    pad.start(now);
    pad.stop(now + 0.5);
  } catch {
    // Audio not available
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Ascending major arpeggio - celebratory
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    masterGain.connect(ctx.destination);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      const t = i * 0.08;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.8, now + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
  } catch {
    // Audio not available
  }
}

export function playAchievementSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Triumphant fanfare
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    masterGain.connect(ctx.destination);

    const notes = [
      { freq: 523.25, t: 0 },      // C5
      { freq: 659.25, t: 0.1 },    // E5
      { freq: 783.99, t: 0.2 },    // G5
      { freq: 1046.50, t: 0.3 },   // C6
      { freq: 1318.51, t: 0.4 },   // E6
      { freq: 1567.98, t: 0.5 },   // G6
    ];

    notes.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + t);
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(0.6, now + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.25);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + t);
      osc.stop(now + t + 0.3);
    });
  } catch {
    // Audio not available
  }
}
