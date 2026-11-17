// Solmar Bay — every sound is synthesized with WebAudio: engine hum, police
// siren, gunshots, pickups and a lazy coastal bass line. No audio files.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.musicTimer = 0;
    this.musicNotes = [110, 130.8, 98, 146.8, 110, 164.8, 130.8, 98];
    this.musicStep = 0;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: two alternating tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch (e) {
      this.ctx = null;
    }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  engine(speed) {
    if (!this.ctx || !this.engineOsc) return;
    const target = Math.abs(speed) > 0.5 ? 0.05 + Math.abs(speed) / 42 * 0.08 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 3.2, this.ctx.currentTime, 0.1);
  }
  engineStart() {
    this.blip(520, 0.12);
  }
  siren(on) {
    if (!this.ctx || !this.sirenOsc) return;
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
  }
  sirenBlip() {
    this.blip(880, 0.1);
    setTimeout(() => this.blip(660, 0.1), 120);
  }
  blip(freq, dur = 0.1, type = 'sine') {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.22, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }
  noiseBurst(dur, gainVal) {
    if (!this.ctx) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = gainVal;
      src.connect(g);
      g.connect(this.master);
      src.start();
    } catch (e) {}
  }
  gunshot() {
    this.noiseBurst(0.16, 0.5);
    this.blip(140, 0.08, 'square');
  }
  dryFire() {
    this.blip(220, 0.05, 'square');
  }
  punch() {
    this.noiseBurst(0.09, 0.3);
  }
  pickup() {
    this.blip(660, 0.09);
    setTimeout(() => this.blip(990, 0.12), 90);
  }
  missionStart() {
    this.blip(440, 0.12);
    setTimeout(() => this.blip(660, 0.16), 130);
  }
  missionComplete() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16), i * 110));
  }
  missionFail() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.2), i * 140));
  }
  // A lazy bass line that ticks along while the player roams.
  update(dt) {
    if (!this.ctx || this.muted) return;
    this.musicTimer += dt;
    if (this.musicTimer > 0.42) {
      this.musicTimer = 0;
      const f = this.musicNotes[this.musicStep % this.musicNotes.length];
      this.musicStep += 1;
      this.blip(f / 2, 0.34, 'triangle');
      if (this.musicStep % 4 === 0) this.blip(f * 2, 0.1, 'sine');
    }
    // Siren wail: alternate the tone while it is on.
    if (this.sirenOn && this.sirenOsc) {
      const t = this.ctx.currentTime;
      this.sirenOsc.frequency.setTargetAtTime(Math.floor(t * 1.6) % 2 === 0 ? 700 : 950, t, 0.05);
    }
  }
}
