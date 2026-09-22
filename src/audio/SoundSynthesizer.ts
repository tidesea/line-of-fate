export type SoundEvent = "DEPLOY" | "SHOOT" | "HIT" | "EXPLODE" | "CAPTURE" | "VICTORY" | "CLICK";

export class SoundSynthesizer {
  private static ctx: AudioContext | null = null;

  private static getContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  static play(event: SoundEvent) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const map: Record<SoundEvent, [OscillatorType, number, number, number, number]> = {
      DEPLOY: ["triangle", 320, 82, 0.09, 0.18], SHOOT: ["square", 840, 110, 0.11, 0.12],
      HIT: ["sawtooth", 190, 70, 0.08, 0.11], EXPLODE: ["sawtooth", 130, 24, 0.36, 0.28],
      CAPTURE: ["sine", 430, 880, 0.25, 0.18], VICTORY: ["triangle", 420, 1040, 0.62, 0.2],
      CLICK: ["sine", 520, 620, 0.05, 0.08],
    };
    const [type, from, to, duration, volume] = map[event];
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + duration);
  }
}

