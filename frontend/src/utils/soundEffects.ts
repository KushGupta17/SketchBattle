/**
 * Zero-dependency Web Audio API synthesizer for instant in-game sound effects (SFX).
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("sketchbattle_muted");
      this.isMuted = storedMute === "true";
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("sketchbattle_muted", String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTone(freq: number, type: OscillatorType, duration: number, gainValue = 0.1, delay = 0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    setTimeout(() => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(gainValue, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (err) {
        // Audio policy or device error
      }
    }, delay * 1000);
  }

  public playCorrectGuess() {
    // Cheerful ascending arpeggio (C5, E5, G5)
    this.playTone(523.25, "sine", 0.15, 0.12, 0);
    this.playTone(659.25, "sine", 0.18, 0.12, 0.1);
    this.playTone(783.99, "sine", 0.35, 0.14, 0.2);
  }

  public playTurnStart() {
    // Energetic start fanfare (A4 -> C#5 -> E5)
    this.playTone(440.0, "triangle", 0.15, 0.15, 0);
    this.playTone(554.37, "triangle", 0.15, 0.15, 0.12);
    this.playTone(659.25, "triangle", 0.3, 0.18, 0.24);
  }

  public playTimeWarning() {
    // Short subtle woodblock tick
    this.playTone(880.0, "sine", 0.05, 0.08, 0);
  }

  public playCloseGuess() {
    // Gentle curious ping
    this.playTone(587.33, "sine", 0.2, 0.1, 0);
  }

  public playPenalty() {
    // Descending buzz
    this.playTone(260.0, "sawtooth", 0.2, 0.1, 0);
    this.playTone(180.0, "sawtooth", 0.35, 0.12, 0.15);
  }

  public playGameEnd() {
    // Victorious chord fanfare
    this.playTone(523.25, "triangle", 0.25, 0.15, 0);
    this.playTone(659.25, "triangle", 0.25, 0.15, 0.15);
    this.playTone(783.99, "triangle", 0.25, 0.15, 0.3);
    this.playTone(1046.5, "triangle", 0.6, 0.2, 0.45);
  }
}

export const soundEffects = new SoundEffectsManager();
