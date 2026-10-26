// Zero-dependency procedural Web Audio synthesizer for flight engine, malfunction sputter, key clicks, and portal warps

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private started: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public initFlightAudio() {
    const ctx = this.ensureContext();
    if (!ctx || this.started) return;
    this.started = true;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 58;

    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 2.5;

    gain.gain.value = 0.035;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    this.engineOsc = osc;
    this.engineFilter = filter;
    this.engineGain = gain;
  }

  public updateEngine(airspeed: number, isFalling: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter) return;
    if (this.muted) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return;
    }
    const now = this.ctx.currentTime;
    const baseFreq = isFalling
      ? 42 + Math.sin(now * 26) * 8 // Sputtering radial engine when malfunctioning
      : 54 + (airspeed - 25) * 1.1;
    this.engineOsc.frequency.setTargetAtTime(Math.max(30, baseFreq), now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(isFalling ? 135 : 210, now, 0.08);
    this.engineGain.gain.setTargetAtTime(isFalling ? 0.042 : 0.028, now, 0.08);
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(muted ? 0 : 0.028, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playKeyStep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playRepairSuccess() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playMalfunctionAlert() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now + offset);
      osc.frequency.linearRampToValueAtTime(175, now + offset + 0.11);
      gain.gain.setValueAtTime(0.06, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  }

  public playPortalWarp() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.55);

    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.55);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.68);
    osc2.stop(now + 0.68);
  }

  public dispose() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
      } catch {
        // ignore
      }
      this.engineOsc = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.started = false;
  }
}

export const soundEngine = new SoundEngine();
