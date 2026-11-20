import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DialogueLine } from "../types/hyperbook";
import { speakText, stopSpeaking } from "../utils/speech";

interface DialogueAudioPlayerProps {
  src: string;
  lines: DialogueLine[];
}

export function DialogueAudioPlayer({ src, lines }: DialogueAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [rate, setRate] = useState<number>(0.95);
  const [showTranscript, setShowTranscript] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopSpeaking();
    };
  }, []);

  const playFromIndex = (startIdx: number) => {
    if (lines.length === 0) return;
    cancelledRef.current = false;
    setIsPlaying(true);

    const step = (idx: number) => {
      if (cancelledRef.current || idx >= lines.length) {
        setIsPlaying(false);
        setActiveIndex(-1);
        return;
      }
      setActiveIndex(idx);
      speakText(lines[idx].text, {
        rate,
        onEnd: () => {
          if (!cancelledRef.current) {
            window.setTimeout(() => step(idx + 1), 350);
          }
        },
      });
    };

    step(startIdx);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      cancelledRef.current = true;
      stopSpeaking();
      setIsPlaying(false);
    } else {
      playFromIndex(activeIndex >= 0 && activeIndex < lines.length ? activeIndex : 0);
    }
  };

  const handleReset = () => {
    cancelledRef.current = true;
    stopSpeaking();
    setIsPlaying(false);
    setActiveIndex(-1);
  };

  const handlePlaySingle = (idx: number) => {
    cancelledRef.current = true;
    stopSpeaking();
    setIsPlaying(false);
    setActiveIndex(idx);
    speakText(lines[idx].text, {
      rate,
      onEnd: () => {
        setActiveIndex((current) => (current === idx ? -1 : current));
      },
    });
  };

  const progressPct =
    lines.length > 0 && activeIndex >= 0
      ? Math.round(((activeIndex + 1) / lines.length) * 100)
      : 0;

  return (
    <div className="my-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Pause dialogue audio" : "Play dialogue audio"}
            className="w-10 h-10 rounded-lg bg-sky-700 hover:bg-sky-800 text-white flex items-center justify-center transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Restart dialogue"
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              Dialogue Audio
            </div>
            <div className="text-xs text-slate-500 font-mono truncate">
              {src} · {lines.length} spoken {lines.length === 1 ? "line" : "lines"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Playback speed"
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
          >
            {[0.75, 0.95, 1.2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setRate(speed)}
                className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md transition-colors whitespace-nowrap ${
                  rate === speed
                    ? "bg-white text-slate-900 shadow-xs font-medium"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {speed === 0.95 ? "1.0x" : `${speed}x`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className="text-xs font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap"
          >
            {showTranscript ? "Hide lines" : "Show lines"}
          </button>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-1 bg-slate-100 w-full">
        <div
          className="h-full bg-sky-600 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {showTranscript && lines.length > 0 && (
        <div className="divide-y divide-slate-100">
          {lines.map((line, idx) => {
            const isCurrent = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePlaySingle(idx)}
                className={`w-full text-left px-5 py-3 flex items-center justify-between gap-4 transition-colors ${
                  isCurrent ? "bg-sky-50/70" : "hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                      {line.speaker}
                    </span>
                    <span className="text-base font-medium text-slate-900">
                      {line.text}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {line.reading}
                    </span>
                  </div>
                </div>
                <Volume2
                  className={`w-4 h-4 shrink-0 ${
                    isCurrent ? "text-sky-700" : "text-slate-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
