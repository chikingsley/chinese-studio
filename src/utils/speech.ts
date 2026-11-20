let audioCtx: AudioContext | null = null;

function playGentleChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch {
    // Audio playback blocked or unavailable
  }
}

export function detectSpeechLang(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30ff]/.test(text)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(text)) return "ko-KR";
  return "en-US";
}

export function speakText(
  text: string,
  options?: { rate?: number; onEnd?: () => void; lang?: string }
): void {
  const rate = options?.rate ?? 0.95;
  const lang = options?.lang ?? detectSpeechLang(text);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    playGentleChime();
    if (options?.onEnd) {
      globalThis.setTimeout(options.onEnd, 700);
    }
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    let ended = false;
    const finish = () => {
      if (!ended) {
        ended = true;
        options?.onEnd?.();
      }
    };

    utterance.onend = finish;
    utterance.onerror = () => {
      playGentleChime();
      finish();
    };

    window.speechSynthesis.speak(utterance);

    // Safety timeout in headless environments where SpeechSynthesis never fires onend
    const fallbackMs = Math.max(1200, Math.min(5000, text.length * 140));
    window.setTimeout(() => {
      if (!ended && !window.speechSynthesis.speaking) {
        finish();
      }
    }, fallbackMs);
  } catch {
    playGentleChime();
    options?.onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
