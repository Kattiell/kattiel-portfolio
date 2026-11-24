// Áudio sintetizado com WebAudio: nada para baixar.
export class Sound {
  constructor() { this.ctx = null; this.on = true; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(ctx.destination);
    // ruído marrom filtrado = cachoeira distante
    const len = ctx.sampleRate * 4; const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } }
    this.noiseBuf = buf;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.35; src.connect(lp).connect(g).connect(this.master); src.start();
    // zumbido grave das máquinas
    const o = ctx.createOscillator(); o.frequency.value = 55; const og = ctx.createGain(); og.gain.value = 0.025; o.connect(og).connect(this.master); o.start();
    const o2 = ctx.createOscillator(); o2.frequency.value = 110.4; const og2 = ctx.createGain(); og2.gain.value = 0.01; o2.connect(og2).connect(this.master); o2.start();
    // gotas aleatórias
    const drip = () => { if (this.on) this.ping(1200 + Math.random() * 1400, 0.05, 0.25); setTimeout(drip, 1500 + Math.random() * 4000); };
    setTimeout(drip, 2000);
  }
  toggle() { this.on = !this.on; if (this.master) this.master.gain.value = this.on ? 0.6 : 0; return this.on; }
  ping(freq, vol = 0.1, dur = 0.4, type = 'sine') {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  }
  sweep(f0, f1, dur, vol = 0.25, q = 6) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  }
  spell(id) {
    // cada distrito tem um timbre: escala pentatônica + varredura de ruído
    const base = [523, 392, 659, 440, 330, 494, 349, 587, 523, 784, 440, 262][id - 1];
    this.sweep(300, 4000, 0.5, 0.2);
    [0, 0.12, 0.24, 0.42].forEach((d, i) => setTimeout(() => this.ping(base * [1, 1.25, 1.5, 2][i], 0.08, 0.9, i % 2 ? 'triangle' : 'sine'), d * 1000));
    setTimeout(() => this.sweep(id === 12 || id === 5 ? 200 : 2000, id === 12 || id === 5 ? 60 : 300, 1.2, 0.3, 2), 900);
  }
  whoosh() { this.sweep(200, 3000, 1.2, 0.35, 1.5); }
  chime() { [784, 988, 1175].forEach((f, i) => setTimeout(() => this.ping(f, 0.07, 1.2), i * 110)); }
  lift() { this.sweep(80, 160, 3, 0.15, 3); }
}
