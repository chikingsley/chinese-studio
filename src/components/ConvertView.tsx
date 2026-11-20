import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { SAMPLE_MESSY_SNIPPETS } from "../data/starterProject";
import { ConvertedChapterPayload } from "../types/hyperbook";
import { serializeVocabCsv } from "../utils/markdownParser";

interface ConvertViewProps {
  nextChapterIndex: number;
  onAddConvertedChapter: (payload: ConvertedChapterPayload) => void;
}

type PreviewTab = "chapter" | "glossary" | "h5p" | "vocab";

export function ConvertView({
  nextChapterIndex,
  onAddConvertedChapter,
}: ConvertViewProps) {
  const [rawText, setRawText] = useState(SAMPLE_MESSY_SNIPPETS[0].rawText);
  const [chapterIndex, setChapterIndex] = useState(nextChapterIndex);
  const [chapterTitle, setChapterTitle] = useState(
    SAMPLE_MESSY_SNIPPETS[0].chapterTitle
  );
  const [subjectHint, setSubjectHint] = useState(SAMPLE_MESSY_SNIPPETS[0].subject);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertedChapterPayload | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("chapter");
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleLoadSample = (idx: number) => {
    const sample = SAMPLE_MESSY_SNIPPETS[idx];
    setRawText(sample.rawText);
    setChapterTitle(sample.chapterTitle);
    setSubjectHint(sample.subject);
    setError(null);
    setAddedSuccess(false);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAddedSuccess(false);

    if (rawText.trim().length < 10) {
      setError("Please paste at least 10 characters of raw textbook text.");
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch("/api/convert-textbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          chapterIndex,
          chapterTitle,
          subjectHint,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Conversion failed on the server.");
      }
      setResult(data as ConvertedChapterPayload);
      setPreviewTab("chapter");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to convert textbook snippet. Please check your connection."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const handleIntegrate = () => {
    if (!result) return;
    onAddConvertedChapter(result);
    setAddedSuccess(true);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="font-editorial text-3xl font-semibold text-slate-900">
          Convert Textbook Snippet to Hyperbook
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-[72ch]">
          Paste any messy 5–30 line textbook excerpt below. It transforms directly into a clean{" "}
          <code className="font-mono text-xs">book/chapter-XX/index.md</code> page, reusable{" "}
          <code className="font-mono text-xs">glossary/*.md</code> cards, a playable{" "}
          <code className="font-mono text-xs">.h5p</code> game, and{" "}
          <code className="font-mono text-xs">data/vocab.csv</code> FSRS flashcards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Raw Input Form */}
        <form
          onSubmit={handleConvert}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Load a messy sample excerpt:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_MESSY_SNIPPETS.map((sample, idx) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => handleLoadSample(idx)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Chapter #</span>
              <input
                type="number"
                min={1}
                value={chapterIndex}
                onChange={(e) => setChapterIndex(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Chapter Title</span>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="Optional (auto-detected)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Subject / Language</span>
              <input
                type="text"
                value={subjectHint}
                onChange={(e) => setSubjectHint(e.target.value)}
                placeholder="Mandarin, Biology..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">
              Messy Textbook Excerpt (OCR scan, PDF copy-paste, or lecture notes)
            </span>
            <textarea
              required
              rows={11}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste 5–30 lines from your textbook here..."
              className="w-full p-3.5 text-sm leading-relaxed bg-slate-50 focus:bg-white border border-slate-300 focus:border-sky-600 rounded-lg resize-y"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-xs text-slate-500 tabular-nums">
              {rawText.trim().length} characters
            </span>
            <button
              type="submit"
              disabled={isConverting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting to Hyperbook...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Hyperbook Package</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right: Structured Output Inspector */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[520px] flex flex-col">
          {result ? (
            <>
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {result.chapter.name}
                  </h2>
                  <div className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                    1 chapter · {result.glossaryTerms.length} glossary files · 1 H5P game ·{" "}
                    {result.vocabRows.length} vocab rows
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleIntegrate}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {addedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Added — Opening Reader</span>
                    </>
                  ) : (
                    <>
                      <span>Add Chapter to Textbook</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="px-5 py-2.5 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
                {(
                  [
                    { id: "chapter", label: `book/${result.chapter.slug}/index.md` },
                    { id: "glossary", label: `glossary/ (${result.glossaryTerms.length})` },
                    { id: "h5p", label: `public/${result.h5pGame.filename}` },
                    { id: "vocab", label: `data/vocab.csv (+${result.vocabRows.length})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreviewTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                      previewTab === t.id
                        ? "bg-sky-50 text-sky-800 font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5 flex-1 overflow-y-auto max-h-[500px] bg-slate-50/30">
                {previewTab === "chapter" && (
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {result.chapter.markdown}
                  </pre>
                )}

                {previewTab === "glossary" && (
                  <div className="space-y-4">
                    {result.glossaryTerms.map((term) => (
                      <div
                        key={term.id}
                        className="p-4 bg-white border border-slate-200 rounded-lg space-y-2"
                      >
                        <div className="text-xs font-mono font-semibold text-sky-800">
                          glossary/{term.id}.md
                        </div>
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {term.markdown}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {previewTab === "h5p" && (
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(result.h5pGame, null, 2)}
                  </pre>
                )}

                {previewTab === "vocab" && (
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {serializeVocabCsv(
                      result.vocabRows.map((r, i) => ({ ...r, id: `preview-${i}` }))
                    )}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="my-auto p-10 text-center space-y-3">
              <h2 className="font-editorial text-xl font-semibold text-slate-900">
                Generated Hyperbook files appear here
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Click &ldquo;Generate Hyperbook Package&rdquo; to transform your messy notes into
                clean Markdown with clickable glossary links, fill-in-the-blank drills, an H5P
                Wordwall game, and FSRS flashcards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
