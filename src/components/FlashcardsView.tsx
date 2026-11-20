import {
  Check,
  Copy,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILD_ANKI_PY } from "../data/starterProject";
import { FSRSCardState, FSRSRating, VocabRow } from "../types/hyperbook";
import {
  downloadAnkiTsv,
  downloadBuildAnkiPy,
  downloadVocabCsv,
} from "../utils/exportProject";
import {
  computeRetrievability,
  createInitialFSRSState,
  scheduleFSRS,
} from "../utils/fsrs";
import { speakText } from "../utils/speech";

interface FlashcardsViewProps {
  vocab: VocabRow[];
  fsrsStates: Record<string, FSRSCardState>;
  onRateCard: (vocabId: string, nextState: FSRSCardState) => void;
  onResetFSRS: () => void;
  onAddVocab: (row: Omit<VocabRow, "id">) => void;
  onUpdateVocab: (row: VocabRow) => void;
  onDeleteVocab: (id: string) => void;
}

type FlashcardsTab = "study" | "csv" | "anki";

export function FlashcardsView({
  vocab,
  fsrsStates,
  onRateCard,
  onResetFSRS,
  onAddVocab,
  onUpdateVocab,
  onDeleteVocab,
}: FlashcardsViewProps) {
  const [tab, setTab] = useState<FlashcardsTab>("study");
  const [chapterFilter, setChapterFilter] = useState<number | "all">("all");
  const [revealed, setRevealed] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);
  const [copiedScript, setCopiedScript] = useState(false);

  // Add vocab row inline state
  const [newHanzi, setNewHanzi] = useState("");
  const [newPinyin, setNewPinyin] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const [newChapter, setNewChapter] = useState(1);
  const [newMetaNote, setNewMetaNote] = useState("");

  const availableChapters = useMemo(() => {
    const set = new Set(vocab.map((v) => v.chapter));
    return Array.from(set).sort((a, b) => a - b);
  }, [vocab]);

  const filteredVocab = useMemo(() => {
    if (chapterFilter === "all") return vocab;
    return vocab.filter((v) => v.chapter === chapterFilter);
  }, [vocab, chapterFilter]);

  const now = Date.now();

  const dueQueue = useMemo(() => {
    return filteredVocab
      .map((row) => ({
        row,
        state: fsrsStates[row.id] ?? createInitialFSRSState(row.id, now),
      }))
      .filter((item) => item.state.due <= now + 60 * 1000)
      .sort((a, b) => a.state.due - b.state.due);
  }, [filteredVocab, fsrsStates, now]);

  const currentItem = dueQueue[0] ?? null;

  const previews = useMemo(() => {
    if (!currentItem) return null;
    return {
      1: scheduleFSRS(currentItem.state, 1),
      2: scheduleFSRS(currentItem.state, 2),
      3: scheduleFSRS(currentItem.state, 3),
      4: scheduleFSRS(currentItem.state, 4),
    };
  }, [currentItem]);

  const handleRate = useCallback(
    (rating: FSRSRating) => {
      if (!currentItem) return;
      const { nextState } = scheduleFSRS(currentItem.state, rating);
      onRateCard(currentItem.row.id, nextState);
      setRevealed(false);
      setReviewedInSession((c) => c + 1);
    },
    [currentItem, onRateCard]
  );

  // Keyboard shortcuts during study
  useEffect(() => {
    if (tab !== "study" || !currentItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (e.code === "Space" && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        if (e.key === "1") handleRate(1);
        else if (e.key === "2") handleRate(2);
        else if (e.key === "3") handleRate(3);
        else if (e.key === "4") handleRate(4);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, currentItem, revealed, handleRate]);

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHanzi.trim() || !newEnglish.trim()) return;
    onAddVocab({
      hanzi: newHanzi.trim(),
      pinyin: newPinyin.trim(),
      english: newEnglish.trim(),
      chapter: Math.max(1, Number(newChapter) || 1),
      meta_note: newMetaNote.trim(),
    });
    setNewHanzi("");
    setNewPinyin("");
    setNewEnglish("");
    setNewMetaNote("");
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(BUILD_ANKI_PY);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const learnedCount = filteredVocab.filter((v) => {
    const st = fsrsStates[v.id];
    return st && st.reps > 0;
  }).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-semibold text-slate-900">
            Meta-Flashcards & FSRS Deck
          </h1>
          <div className="text-sm text-slate-600 mt-1 tabular-nums">
            Single source of truth (<code className="font-mono text-xs">data/vocab.csv</code>) ·{" "}
            {dueQueue.length} due now · {learnedCount} / {filteredVocab.length} reviewed
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Flashcards views"
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
          >
            {(
              [
                { id: "study", label: "Study Deck (FSRS)" },
                { id: "csv", label: "Master vocab.csv" },
                { id: "anki", label: "Anki Export Script" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chapter Scope Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Deck Scope:</span>
          <button
            type="button"
            onClick={() => {
              setChapterFilter("all");
              setRevealed(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              chapterFilter === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Chapters ({vocab.length})
          </button>
          {availableChapters.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                setChapterFilter(ch);
                setRevealed(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap tabular-nums ${
                chapterFilter === ch
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Chapter {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadVocabCsv(vocab)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>vocab.csv</span>
          </button>
          <button
            type="button"
            onClick={() => downloadAnkiTsv(vocab)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Anki .tsv</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FSRS STUDY STAGE */}
      {tab === "study" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 min-h-[420px] flex flex-col justify-between">
            {currentItem ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>
                    ch{String(currentItem.row.chapter).padStart(2, "0")} ·{" "}
                    {currentItem.state.state} · reps: {currentItem.state.reps}
                  </span>
                  <span>{dueQueue.length} remaining in queue</span>
                </div>

                <div className="py-10 text-center space-y-5">
                  <div className="flex items-center justify-center gap-3">
                    <div className="font-editorial text-5xl sm:text-6xl font-semibold text-slate-900">
                      {currentItem.row.hanzi}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(currentItem.row.hanzi)}
                      aria-label={`Pronounce ${currentItem.row.hanzi}`}
                      className="p-2.5 text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {revealed ? (
                    <div className="pt-5 border-t border-slate-200 max-w-lg mx-auto space-y-3">
                      <div className="text-lg font-mono text-sky-700">
                        {currentItem.row.pinyin}
                      </div>
                      <div className="text-2xl font-semibold text-slate-900">
                        {currentItem.row.english}
                      </div>
                      {currentItem.row.meta_note && (
                        <p className="text-sm text-slate-600 leading-relaxed pt-1">
                          {currentItem.row.meta_note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Recall the pronunciation, meaning, and meta-connection before revealing.
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  {!revealed ? (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setRevealed(true)}
                        className="px-8 py-3 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
                      >
                        Show Answer (Space)
                      </button>
                    </div>
                  ) : (
                    previews && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                          type="button"
                          onClick={() => handleRate(1)}
                          className="px-3 py-3 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-900 transition-colors text-center"
                        >
                          <div className="text-sm font-semibold">1 · Again</div>
                          <div className="text-xs font-mono tabular-nums text-red-700 mt-0.5">
                            {previews[1].intervalLabel}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(2)}
                          className="px-3 py-3 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 transition-colors text-center"
                        >
                          <div className="text-sm font-semibold">2 · Hard</div>
                          <div className="text-xs font-mono tabular-nums text-amber-800 mt-0.5">
                            {previews[2].intervalLabel}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(3)}
                          className="px-3 py-3 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 transition-colors text-center"
                        >
                          <div className="text-sm font-semibold">3 · Good</div>
                          <div className="text-xs font-mono tabular-nums text-emerald-700 mt-0.5">
                            {previews[3].intervalLabel}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(4)}
                          className="px-3 py-3 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 transition-colors text-center"
                        >
                          <div className="text-sm font-semibold">4 · Easy</div>
                          <div className="text-xs font-mono tabular-nums text-sky-700 mt-0.5">
                            {previews[4].intervalLabel}
                          </div>
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="my-auto text-center space-y-4 py-12">
                <h2 className="font-editorial text-2xl font-semibold text-slate-900">
                  All due cards complete
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  You reviewed {reviewedInSession} cards this session. FSRS scheduled your next
                  intervals to target 90% recall retention.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetFSRS();
                      setReviewedInSession(0);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Schedule to Practice Again</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right FSRS Memory Parameters Panel */}
          <aside className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                FSRS Memory Model
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Free Spaced Repetition Scheduler tracks stability (days until recall drops to 90%)
                and item difficulty per card.
              </p>
            </div>

            {currentItem ? (
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Card Status</dt>
                  <dd className="font-mono text-slate-900 capitalize">
                    {currentItem.state.state}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Stability (S)</dt>
                  <dd className="font-mono tabular-nums text-slate-900">
                    {currentItem.state.stability > 0
                      ? `${currentItem.state.stability}d`
                      : "Initial"}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Difficulty (D)</dt>
                  <dd className="font-mono tabular-nums text-slate-900">
                    {currentItem.state.difficulty > 0
                      ? `${currentItem.state.difficulty} / 10`
                      : "Unrated"}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Retrievability (R)</dt>
                  <dd className="font-mono tabular-nums text-slate-900">
                    {currentItem.state.reps > 0
                      ? `${Math.round(computeRetrievability(currentItem.state) * 100)}%`
                      : "New"}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Session Reviews</dt>
                  <dd className="font-mono tabular-nums text-slate-900">
                    {reviewedInSession}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="text-xs text-slate-500">
                No cards currently due in this scope.
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-500">
              <div className="font-medium text-slate-700">Keyboard Shortcuts</div>
              <div>
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Space</code> Reveal
                answer · <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">1–4</code>{" "}
                Rate recall
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: MASTER VOCAB.CSV TABLE */}
      {tab === "csv" && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddRow}
            className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Term / Hanzi</span>
              <input
                required
                type="text"
                value={newHanzi}
                onChange={(e) => setNewHanzi(e.target.value)}
                placeholder="茶"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Pinyin / Cue</span>
              <input
                type="text"
                value={newPinyin}
                onChange={(e) => setNewPinyin(e.target.value)}
                placeholder="chá"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">English Meaning</span>
              <input
                required
                type="text"
                value={newEnglish}
                onChange={(e) => setNewEnglish(e.target.value)}
                placeholder="tea"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Chapter #</span>
              <input
                type="number"
                min={1}
                value={newChapter}
                onChange={(e) => setNewChapter(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Meta-Note</span>
              <input
                type="text"
                value={newMetaNote}
                onChange={(e) => setNewMetaNote(e.target.value)}
                placeholder="Root word for chai / tea"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Row</span>
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">hanzi</th>
                  <th className="py-3 px-4">pinyin</th>
                  <th className="py-3 px-4">english</th>
                  <th className="py-3 px-4">chapter</th>
                  <th className="py-3 px-4">meta_note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVocab.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      <input
                        type="text"
                        value={row.hanzi}
                        aria-label={`Term for ${row.english}`}
                        onChange={(e) => onUpdateVocab({ ...row, hanzi: e.target.value })}
                        className="w-28 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-sky-600 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-sky-800">
                      <input
                        type="text"
                        value={row.pinyin}
                        aria-label={`Pinyin for ${row.hanzi}`}
                        onChange={(e) => onUpdateVocab({ ...row, pinyin: e.target.value })}
                        className="w-28 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-sky-600 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      <input
                        type="text"
                        value={row.english}
                        aria-label={`Meaning for ${row.hanzi}`}
                        onChange={(e) => onUpdateVocab({ ...row, english: e.target.value })}
                        className="w-44 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-sky-600 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                      ch{String(row.chapter).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <input
                        type="text"
                        value={row.meta_note}
                        aria-label={`Meta note for ${row.hanzi}`}
                        onChange={(e) => onUpdateVocab({ ...row, meta_note: e.target.value })}
                        className="w-full min-w-[220px] bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-sky-600 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => speakText(row.hanzi)}
                        aria-label={`Pronounce ${row.hanzi}`}
                        className="p-1.5 text-slate-500 hover:text-sky-700 rounded"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVocab(row.id)}
                        aria-label={`Delete ${row.hanzi}`}
                        className="p-1.5 text-slate-500 hover:text-red-700 rounded ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BUILD_ANKI.PY SCRIPT */}
      {tab === "anki" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-mono">
                data/build_anki.py
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Reads your master <code className="font-mono">data/vocab.csv</code> and builds a chapter-tagged{" "}
                <code className="font-mono">.apkg</code> deck for Anki with FSRS enabled.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Copied" : "Copy Script"}</span>
              </button>
              <button
                type="button"
                onClick={downloadBuildAnkiPy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download build_anki.py</span>
              </button>
            </div>
          </div>

          <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50/40 overflow-x-auto leading-relaxed">
            <code>{BUILD_ANKI_PY}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
