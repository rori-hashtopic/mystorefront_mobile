const AUDIO_SRC = "/audio/walkthrough-cinematic.mp3";

export class LofiPlayer {
  private audio: HTMLAudioElement | null = null;
  private targetVolume = 0.3;

  private getAudio() {
    if (typeof window === "undefined") return null;
    if (!this.audio) {
      this.audio = new Audio(AUDIO_SRC);
      this.audio.loop = true;
      this.audio.preload = "auto";
      this.audio.volume = 0;
      this.audio.muted = true;
    }
    return this.audio;
  }

  async start(volume = 0.3) {
    const audio = this.getAudio();
    if (!audio) return;
    this.targetVolume = volume;
    audio.volume = volume;
    audio.muted = false;
    try {
      await audio.play();
    } catch {
      audio.muted = true;
    }
  }

  setMuted(muted: boolean, volume = this.targetVolume) {
    const audio = this.getAudio();
    if (!audio) return;
    this.targetVolume = volume;
    audio.muted = muted;
    audio.volume = muted ? 0 : volume;
    if (!muted) void audio.play().catch(() => {});
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}