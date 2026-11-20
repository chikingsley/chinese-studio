import {
  CheckCircle2,
  Code2,
  Download,
  RotateCcw,
  Volume2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { H5PGameFile, H5PMode } from "../types/hyperbook";
import { buildH5PContentJson, downloadH5PFile } from "../utils/exportProject";
import { speakText } from "../utils/speech";

interface H5PGameWidgetProps {
  game: H5PGameFile;
  onUpdateGame?: (updated: H5PGameFile) => void;
}

const MODE_OPTIONS: { id: H5PMode; label: string }[] = [
  { id: "drag-words", label: "Drag the Words" },
  { id: "match-up", label: "Match Up" },
  { id: "memory", label: "Memory Game" },
  { id: "dialog-cards", label: "Dialog Cards" },
];

interface ParsedDragSegment {
  type: "text" | "blank";
  value: string;
  slotId?: string;
}

function parseDragSentences(sentences: string[]) {
  const blanks: { slotId: string; answer: string }[] = [];
  const parsed = sentences.map((sentence, sIdx) => {
    const segments: ParsedDragSegment[] = [];
    const regex = /\*([^*]+)\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let bIdx = 0;
    while ((match = regex.exec(sentence)) !== null) {
      if (match.index > last) {
        segments.push({ type: "text", value: sentence.slice(last, match.index) });
      }
      const slotId = `s${sIdx}-b${bIdx}`;
      blanks.push({ slotId, answer: match[1].trim() });
      segments.push({ type: "blank", value: match[1].trim(), slotId });
      bIdx += 1;
      last = regex.lastIndex;
    }
    if (last < sentence.length) {
      segments.push({ type: "text", value: sentence.slice(last) });
    }
    return segments;
  });
  return { parsed, blanks };
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function H5PGameWidget({ game, onUpdateGame }: H5PGameWidgetProps) {
  const [mode, setMode] = useState<H5PMode>(game.defaultMode || "drag-words");
  const [showJson, setShowJson] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(17);

  // Drag the Words state
  const { parsed: dragParsed, blanks: dragBlanks } = useMemo(
    () =>
      parseDragSentences(
        game.dragSentences.length > 0
          ? game.dragSentences
          : game.pairs.map((p) => `${p.meaning}: *${p.term}*`)
      ),
    [game.dragSentences, game.pairs]
  );

  const wordBank = useMemo(
    () =>
      deterministicShuffle(
        dragBlanks.map((b, idx) => ({ tokenId: `tok-${idx}-${b.answer}`, text: b.answer })),
        shuffleSeed
      ),
    [dragBlanks, shuffleSeed]
  );

  const [placedTokens, setPlacedTokens] = useState<Record<string, { tokenId: string; text: string }>>({});
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [dragChecked, setDragChecked] = useState(false);

  // Match Up state
  const shuffledMeanings = useMemo(
    () => deterministicShuffle(game.pairs, shuffleSeed + 3),
    [game.pairs, shuffleSeed]
  );
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongMatchId, setWrongMatchId] = useState<string | null>(null);

  // Memory Game state
  const memoryDeck = useMemo(() => {
    const cards = game.pairs.slice(0, 6).flatMap((p) => [
      { cardId: `${p.id}-term`, pairId: p.id, label: p.term, sub: p.reading, side: "term" as const },
      { cardId: `${p.id}-meaning`, pairId: p.id, label: p.meaning, sub: "Meaning", side: "meaning" as const },
    ]);
    return deterministicShuffle(cards, shuffleSeed + 11);
  }, [game.pairs, shuffleSeed]);

  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [memorySolvedPairs, setMemorySolvedPairs] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);

  // Dialog Cards state
  const [dialogIndex, setDialogIndex] = useState(0);
  const [dialogFlipped, setDialogFlipped] = useState(false);

  // JSON editor state
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setMode(game.defaultMode || "drag-words");
    setPlacedTokens({});
    setSelectedTokenId(null);
    setDragChecked(false);
    setSelectedTermId(null);
    setMatchedIds([]);
    setFlippedIds([]);
    setMemorySolvedPairs([]);
    setMemoryMoves(0);
    setDialogIndex(0);
    setDialogFlipped(false);
  }, [game.filename, game.defaultMode]);

  const resetCurrentGame = () => {
    setShuffleSeed((s) => s + 7);
    setPlacedTokens({});
    setSelectedTokenId(null);
    setDragChecked(false);
    setSelectedTermId(null);
    setMatchedIds([]);
    setWrongMatchId(null);
    setFlippedIds([]);
    setMemorySolvedPairs([]);
    setMemoryMoves(0);
    setDialogIndex(0);
    setDialogFlipped(false);
  };

  // Drag the Words helpers
  const usedTokenIds = new Set(Object.values(placedTokens).map((t) => t.tokenId));

  const placeTokenInSlot = (slotId: string, token: { tokenId: string; text: string }) => {
    setDragChecked(false);
    setPlacedTokens((prev) => {
      const next = { ...prev };
      // Remove token if already placed in another slot
      for (const [k, v] of Object.entries(next)) {
        if (v.tokenId === token.tokenId) {
          delete next[k];
        }
      }
      next[slotId] = token;
      return next;
    });
    setSelectedTokenId(null);
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedTokenId) {
      const token = wordBank.find((t) => t.tokenId === selectedTokenId);
      if (token) {
        placeTokenInSlot(slotId, token);
      }
      return;
    }
    if (placedTokens[slotId]) {
      setDragChecked(false);
      setPlacedTokens((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
    }
  };

  const dragCorrectCount = dragBlanks.filter(
    (b) => placedTokens[b.slotId]?.text === b.answer
  ).length;

  // Match Up handler
  const handleMeaningClick = (pairId: string) => {
    if (!selectedTermId || matchedIds.includes(pairId)) return;
    if (selectedTermId === pairId) {
      setMatchedIds((prev) => [...prev, pairId]);
      setSelectedTermId(null);
      setWrongMatchId(null);
    } else {
      setWrongMatchId(pairId);
      window.setTimeout(() => setWrongMatchId(null), 650);
    }
  };

  // Memory card click handler
  const handleMemoryCardClick = (cardId: string, pairId: string) => {
    if (
      flippedIds.includes(cardId) ||
      memorySolvedPairs.includes(pairId) ||
      flippedIds.length >= 2
    ) {
      return;
    }
    const nextFlipped = [...flippedIds, cardId];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const firstCard = memoryDeck.find((c) => c.cardId === nextFlipped[0]);
      const secondCard = memoryDeck.find((c) => c.cardId === nextFlipped[1]);
      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        window.setTimeout(() => {
          setMemorySolvedPairs((prev) => [...prev, firstCard.pairId]);
          setFlippedIds([]);
        }, 420);
      } else {
        window.setTimeout(() => {
          setFlippedIds([]);
        }, 850);
      }
    }
  };

  const handleToggleJson = () => {
    if (!showJson) {
      setJsonDraft(JSON.stringify(buildH5PContentJson(game), null, 2));
      setJsonError(null);
    }
    setShowJson((prev) => !prev);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!Array.isArray(parsed.pairs)) {
        setJsonError("JSON must include a 'pairs' array.");
        return;
      }
      const nextSentences =
        typeof parsed.textField === "string"
          ? parsed.textField
              .split(/\n+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : game.dragSentences;

      onUpdateGame?.({
        ...game,
        pairs: parsed.pairs,
        dragSentences: nextSentences,
      });
      setJsonError(null);
      setShowJson(false);
    } catch {
      setJsonError("Invalid JSON syntax. Please check commas and quotes.");
    }
  };

  return (
    <div className="my-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900 text-[15px]">{game.title}</h4>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            public/{game.filename} · {game.pairs.length} pairs
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="H5P interaction template"
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
          >
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                role="tab"
                type="button"
                aria-selected={mode === opt.id}
                onClick={() => setMode(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === opt.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleJson}
            aria-label="Inspect H5P content.json"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showJson ? "Close JSON" : "content.json"}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadH5PFile(game)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 border border-sky-200 bg-sky-50/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.h5p</span>
          </button>
        </div>
      </div>

      {/* Optional JSON editor for Lumi / Automated workflow */}
      {showJson ? (
        <div className="p-5 bg-slate-50/50 space-y-3">
          <p className="text-xs text-slate-600">
            Because an <code className="font-mono">.h5p</code> file is a ZIP archive containing{" "}
            <code className="font-mono">content/content.json</code>, you can edit pairs or{" "}
            <code className="font-mono">*target*</code> drag sentences directly here.
          </p>
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            rows={12}
            className="w-full font-mono text-xs p-3.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-sky-600"
          />
          {jsonError && (
            <p className="text-xs text-red-700 font-medium">{jsonError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJson(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyJson}
              className="px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
            >
              Apply to H5P Activity
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          {/* MODE 1: DRAG THE WORDS */}
          {mode === "drag-words" && (
            <div className="space-y-5">
              <div className="text-xs text-slate-500">
                Drag a word into a blank slot, or click a word then click a blank slot to place it.
              </div>

              {/* Word bank */}
              <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[56px]">
                {wordBank.map((token) => {
                  const isUsed = usedTokenIds.has(token.tokenId);
                  const isSelected = selectedTokenId === token.tokenId;
                  if (isUsed) return null;
                  return (
                    <button
                      key={token.tokenId}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", JSON.stringify(token));
                      }}
                      onClick={() =>
                        setSelectedTokenId((prev) =>
                          prev === token.tokenId ? null : token.tokenId
                        )
                      }
                      className={`px-3.5 py-2 text-sm font-medium rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                        isSelected
                          ? "bg-sky-700 text-white border-sky-700 shadow-xs"
                          : "bg-white text-slate-900 border-slate-300 hover:border-sky-500"
                      }`}
                    >
                      {token.text}
                    </button>
                  );
                })}
                {usedTokenIds.size === wordBank.length && (
                  <span className="text-xs text-slate-500 self-center">
                    All words placed. Click Check Answers below or click a placed word to return it.
                  </span>
                )}
              </div>

              {/* Sentences with Drop Targets */}
              <div className="space-y-3.5 text-[15px] leading-8 text-slate-800">
                {dragParsed.map((segments, sIdx) => (
                  <p key={sIdx}>
                    {segments.map((seg, segIdx) => {
                      if (seg.type === "text") {
                        return <span key={segIdx}>{seg.value}</span>;
                      }
                      const slotId = seg.slotId!;
                      const placed = placedTokens[slotId];
                      const isCorrect = dragChecked && placed?.text === seg.value;
                      const isWrong = dragChecked && (!placed || placed.text !== seg.value);

                      return (
                        <button
                          key={segIdx}
                          type="button"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            try {
                              const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                              if (data?.tokenId && data?.text) {
                                placeTokenInSlot(slotId, data);
                              }
                            } catch {
                              // ignore malformed drop
                            }
                          }}
                          onClick={() => handleSlotClick(slotId)}
                          className={`inline-flex items-center justify-center min-w-[84px] mx-1 px-3 py-0.5 rounded-md border text-sm font-medium align-baseline transition-colors ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                              : isWrong
                              ? "bg-red-50 border-red-400 text-red-800"
                              : placed
                              ? "bg-sky-50 border-sky-400 text-sky-900"
                              : selectedTokenId
                              ? "bg-sky-50/50 border-dashed border-sky-500 text-sky-700"
                              : "bg-slate-50 border-dashed border-slate-300 text-slate-400"
                          }`}
                        >
                          {placed ? placed.text : "drop here"}
                        </button>
                      );
                    })}
                  </p>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDragChecked(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
                  >
                    Check Answers
                  </button>
                  <button
                    type="button"
                    onClick={resetCurrentGame}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>

                {dragChecked && (
                  <div
                    className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${
                      dragCorrectCount === dragBlanks.length
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {dragCorrectCount === dragBlanks.length ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>
                      Score: {dragCorrectCount} / {dragBlanks.length}
                      {dragCorrectCount === dragBlanks.length ? " — Complete" : " — Adjust highlighted slots"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: MATCH UP */}
          {mode === "match-up" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Select a term on the left, then click its matching meaning on the right.</span>
                <span className="font-mono tabular-nums">
                  {matchedIds.length} / {game.pairs.length} matched
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {game.pairs.map((p) => {
                    const solved = matchedIds.includes(p.id);
                    const active = selectedTermId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={solved}
                        onClick={() => setSelectedTermId(p.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                          solved
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                            : active
                            ? "bg-sky-50 border-sky-600 text-sky-950"
                            : "bg-white border-slate-200 hover:border-slate-400 text-slate-900"
                        }`}
                      >
                        <div>
                          <div className="text-base font-semibold">{p.term}</div>
                          <div className="text-xs font-mono text-slate-500">{p.reading}</div>
                        </div>
                        {solved && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {shuffledMeanings.map((p) => {
                    const solved = matchedIds.includes(p.id);
                    const isWrong = wrongMatchId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={solved}
                        onClick={() => handleMeaningClick(p.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-2 min-h-[62px] ${
                          solved
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                            : isWrong
                            ? "bg-red-50 border-red-400 text-red-800"
                            : "bg-white border-slate-200 hover:border-sky-400 text-slate-800"
                        }`}
                      >
                        <span className="text-sm font-medium">{p.meaning}</span>
                        {isWrong && <span className="text-xs font-medium text-red-700">Try again</span>}
                        {solved && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetCurrentGame}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Shuffle & Restart</span>
                </button>
                {matchedIds.length === game.pairs.length && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All pairs matched</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: MEMORY GAME */}
          {mode === "memory" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Flip two cards to pair each term with its meaning.</span>
                <span className="font-mono tabular-nums">
                  {memorySolvedPairs.length} / {Math.min(6, game.pairs.length)} pairs · {memoryMoves} moves
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {memoryDeck.map((card) => {
                  const isSolved = memorySolvedPairs.includes(card.pairId);
                  const isRevealed = isSolved || flippedIds.includes(card.cardId);
                  return (
                    <button
                      key={card.cardId}
                      type="button"
                      onClick={() => handleMemoryCardClick(card.cardId, card.pairId)}
                      className={`h-24 p-3 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                        isSolved
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : isRevealed
                          ? "bg-white border-sky-500 text-slate-900"
                          : "bg-slate-100 border-slate-200 hover:bg-slate-200/70 text-slate-500"
                      }`}
                    >
                      {isRevealed ? (
                        <>
                          <span className="text-sm font-semibold leading-snug">{card.label}</span>
                          <span className="text-[11px] font-mono text-slate-500 mt-1">
                            {card.sub}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-mono text-slate-400">Flip</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={resetCurrentGame}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Board</span>
                </button>
                {memorySolvedPairs.length === Math.min(6, game.pairs.length) && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cleared in {memoryMoves} moves</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MODE 4: DIALOG CARDS */}
          {mode === "dialog-cards" && game.pairs.length > 0 && (
            <div className="space-y-4">
              {(() => {
                const pair = game.pairs[dialogIndex % game.pairs.length];
                return (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Click the card to turn it over and reveal meaning & literal cue.</span>
                      <span className="font-mono tabular-nums">
                        Card {(dialogIndex % game.pairs.length) + 1} / {game.pairs.length}
                      </span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setDialogFlipped((f) => !f)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDialogFlipped((f) => !f);
                        }
                      }}
                      className="min-h-[180px] p-6 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-sky-400 transition-colors flex flex-col items-center justify-center text-center gap-2"
                    >
                      {!dialogFlipped ? (
                        <>
                          <div className="text-3xl font-semibold text-slate-900">
                            {pair.term}
                          </div>
                          <div className="text-sm font-mono text-sky-700">{pair.reading}</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakText(pair.term);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-sky-400"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-semibold text-slate-900">
                            {pair.meaning}
                          </div>
                          <div className="text-sm text-slate-600 max-w-md">{pair.hint}</div>
                          <div className="text-xs font-mono text-slate-400 mt-1">
                            {pair.term} · {pair.reading}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setDialogFlipped(false);
                          setDialogIndex(
                            (i) => (i - 1 + game.pairs.length) % game.pairs.length
                          );
                        }}
                        className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialogFlipped((f) => !f)}
                        className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg"
                      >
                        {dialogFlipped ? "Show Term" : "Turn Card"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDialogFlipped(false);
                          setDialogIndex((i) => (i + 1) % game.pairs.length);
                        }}
                        className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                      >
                        Next
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
