// High-fidelity synthesized tabletop physical audio effects
class SoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Realistic wooden tile clack on tabletop felt
  public playTileClack() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Body resonance (wood impact)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);

    // High snap click (tile contact)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sawtooth';
    clickOsc.frequency.setValueAtTime(1400, ctx.currentTime);
    clickOsc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.02);

    clickGain.gain.setValueAtTime(0.2, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    clickOsc.start();
    clickOsc.stop(ctx.currentTime + 0.02);
  }

  // Physical wire snip with metallic shear
  public playWireSnip() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // High metal friction scrape
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(3200, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);

    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start();
    osc1.stop(ctx.currentTime + 0.08);

    // Mechanical snap
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(450, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.07);

    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start();
    osc2.stop(ctx.currentTime + 0.07);
  }

  // Crisp card swish on felt
  public playCardFlip() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  // Mechanical detonator tick
  public playDetonatorTick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  }

  public playClick() {
    this.playTileClack();
  }

  public playTick() {
    this.playDetonatorTick();
  }

  public playJoin() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [330, 440, 554.37];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.2);
    });
  }

  public playStart() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const chord = [261.63, 329.63, 392.0, 523.25];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.35);
    });
  }

  public playAlarm() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }

  public playVictory() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.9);
    });
  }
}

export const soundFX = new SoundFX();
