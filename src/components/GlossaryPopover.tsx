import { ArrowUpRight, BookOpen, Volume2, X } from "lucide-react";
import { useEffect } from "react";
import { ChapterFile, GlossaryEntry } from "../types/hyperbook";
import {
  findChaptersReferencingTerm,
  parseFrontmatter,
  parseInline,
} from "../utils/markdownParser";
import { speakText } from "../utils/speech";

interface GlossaryPopoverProps {
  entry: GlossaryEntry | null;
  chapters: ChapterFile[];
  onClose: () => void;
  onNavigateChapter: (slug: string) => void;
  onOpenInGlossary: (id: string) => void;
  onPracticeFlashcards: () => void;
}

export function GlossaryPopover({
  entry,
  chapters,
  onClose,
  onNavigateChapter,
  onOpenInGlossary,
  onPracticeFlashcards,
}: GlossaryPopoverProps) {
  useEffect(() => {
    if (!entry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const { meta, body } = parseFrontmatter(entry.markdown);
  const title = meta.name || entry.name;
  const backlinks = findChaptersReferencingTerm(chapters, entry.id);
  const speakableTerm = title.split("(")[0].trim();

  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-popover-title"
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 font-mono mb-1">
              glossary/{entry.id}.md
            </div>
            <div className="flex items-center gap-2.5">
              <h3
                id="glossary-popover-title"
                className="font-editorial text-2xl font-semibold text-slate-900"
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={() => speakText(speakableTerm)}
                aria-label={`Pronounce ${speakableTerm}`}
                className="p-2 rounded-lg text-sky-700 hover:bg-sky-50 transition-colors shrink-0"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary card"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3 text-[15px] leading-relaxed text-slate-700">
          {lines.map((line, idx) => (
            <p key={idx}>
              {parseInline(line).map((node, nIdx) => {
                if (node.type === "bold") {
                  return (
                    <strong key={nIdx} className="font-semibold text-slate-900">
                      {node.value}
                    </strong>
                  );
                }
                if (node.type === "italic") {
                  return (
                    <em key={nIdx} className="italic text-slate-600">
                      {node.value}
                    </em>
                  );
                }
                if (node.type === "code") {
                  return (
                    <code
                      key={nIdx}
                      className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-mono"
                    >
                      {node.value}
                    </code>
                  );
                }
                return <span key={nIdx}>{node.type === "term" ? node.label : node.value}</span>;
              })}
            </p>
          ))}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {backlinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Referenced in:</span>
              {backlinks.map((ch, idx) => (
                <span key={ch.slug} className="inline-flex items-center gap-1">
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateChapter(ch.slug);
                      onClose();
                    }}
                    className="text-sky-700 hover:underline font-medium"
                  >
                    {ch.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={() => {
                onOpenInGlossary(entry.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              <span>Edit in Glossary</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPracticeFlashcards();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap"
            >
              <span>Review in FSRS Deck</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
