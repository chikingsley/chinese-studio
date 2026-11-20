import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  FileText,
  Layers,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { H5PGameFile, TextbookProject } from "../types/hyperbook";
import { extractReferencedGlossaryIds } from "../utils/markdownParser";
import { HyperbookRenderer } from "./HyperbookRenderer";

const COVER_IMAGE_URL =
  "/src/assets/images/textbook_cover_editorial_1795134008677.jpg";

interface ReaderViewProps {
  project: TextbookProject;
  activeChapterSlug: string; // "index" or chapter slug
  onSelectChapter: (slug: string) => void;
  onSelectGlossaryId: (id: string) => void;
  onSandboxChange: (key: string, value: string) => void;
  onUpdateH5PGame: (updated: H5PGameFile) => void;
  onOpenInWorkspace: (filePath: string) => void;
  onGoToConvert: () => void;
}

export function ReaderView({
  project,
  activeChapterSlug,
  onSelectChapter,
  onSelectGlossaryId,
  onSandboxChange,
  onUpdateH5PGame,
  onOpenInWorkspace,
  onGoToConvert,
}: ReaderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [coverFailed, setCoverFailed] = useState(false);

  const sortedChapters = useMemo(
    () => [...project.chapters].sort((a, b) => a.index - b.index),
    [project.chapters]
  );

  const activeChapter = sortedChapters.find((c) => c.slug === activeChapterSlug) || null;
  const activeChapterIndex = activeChapter
    ? sortedChapters.findIndex((c) => c.slug === activeChapter.slug)
    : -1;

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedChapters;
    return sortedChapters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.markdown.toLowerCase().includes(q)
    );
  }, [sortedChapters, searchQuery]);

  const matchingGlossary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return project.glossary
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.markdown.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [project.glossary, searchQuery]);

  const activeTermsCount = activeChapter
    ? extractReferencedGlossaryIds(activeChapter.markdown).length
    : project.glossary.length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="lg:sticky lg:top-24 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <div className="font-editorial text-lg font-semibold text-slate-900">
              {project.config.name}
            </div>
            <div className="text-xs text-slate-500 mt-1 tabular-nums">
              {sortedChapters.length} chapters · {project.glossary.length} glossary terms ·{" "}
              {project.vocab.length} flashcards
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search book & glossary..."
              aria-label="Search book and glossary"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-600"
            />
          </div>

          <nav aria-label="Book contents" className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectChapter("index")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors ${
                activeChapterSlug === "index"
                  ? "bg-sky-50 text-sky-800"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Book Overview</span>
            </button>

            <div className="pt-3 pb-1 px-3 text-xs font-medium text-slate-500">
              Chapters
            </div>

            {filteredChapters.map((ch) => {
              const isSelected = activeChapterSlug === ch.slug;
              const termCount = extractReferencedGlossaryIds(ch.markdown).length;
              return (
                <button
                  key={ch.slug}
                  type="button"
                  onClick={() => onSelectChapter(ch.slug)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-sky-50 text-sky-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-medium leading-snug">{ch.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    book/{ch.slug}/index.md · {termCount} terms
                  </div>
                </button>
              );
            })}

            {filteredChapters.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">
                No chapters match &ldquo;{searchQuery}&rdquo;.
              </p>
            )}
          </nav>

          {matchingGlossary.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <div className="px-3 text-xs font-medium text-slate-500">
                Matching Glossary Cards
              </div>
              {matchingGlossary.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGlossaryId(g.id)}
                  className="w-full text-left px-3 py-2 text-sm text-sky-800 hover:bg-sky-50 rounded-lg transition-colors truncate"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onGoToConvert}
              className="w-full px-3.5 py-2.5 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors text-center"
            >
              + Convert Messy Textbook Snippet
            </button>
          </div>
        </aside>

        {/* Right Main Editorial Reading Canvas */}
        <main className="min-w-0 bg-white border border-slate-200 rounded-xl">
          {activeChapterSlug === "index" ? (
            <div className="p-6 sm:p-10 space-y-8">
              {/* Two-column editorial book overview */}
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-8 items-stretch">
                <div className="flex flex-col justify-center space-y-4">
                  <div className="text-xs font-mono text-slate-500">
                    book/index.md · Open-Source Hyperbook Blueprint
                  </div>
                  <h1 className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                    {project.config.name}
                  </h1>
                  <p className="text-[16px] leading-relaxed text-slate-600 max-w-[60ch]">
                    {project.config.description}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {sortedChapters[0] && (
                      <button
                        type="button"
                        onClick={() => onSelectChapter(sortedChapters[0].slug)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
                      >
                        <span>Start Reading Chapter 1</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onGoToConvert}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <span>Convert Your Textbook</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[220px] flex items-center justify-center">
                  {!coverFailed ? (
                    <img
                      src={COVER_IMAGE_URL}
                      alt="Architectural book and modular cards illustration for Mandarin Foundations"
                      referrerPolicy="no-referrer"
                      onError={() => setCoverFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2">
                      <Layers className="w-8 h-8 text-sky-700 mx-auto" />
                      <div className="font-editorial text-lg font-semibold text-slate-800">
                        {project.config.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">
                <HyperbookRenderer
                  markdown={project.homeMarkdown}
                  chapterSlug="index"
                  audioLines={[]}
                  glossary={project.glossary}
                  h5pGames={project.h5pGames}
                  sandboxResponses={project.sandboxResponses}
                  onSandboxChange={onSandboxChange}
                  onSelectGlossaryId={onSelectGlossaryId}
                  onUpdateH5PGame={onUpdateH5PGame}
                />
              </div>

              {/* Chapter Directory */}
              <div className="border-t border-slate-200 pt-8 space-y-4">
                <h2 className="font-editorial text-2xl font-semibold text-slate-900">
                  Table of Contents
                </h2>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {sortedChapters.map((ch) => {
                    const termIds = extractReferencedGlossaryIds(ch.markdown);
                    return (
                      <button
                        key={ch.slug}
                        type="button"
                        onClick={() => onSelectChapter(ch.slug)}
                        className="w-full text-left px-5 py-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">
                            {ch.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                            book/{ch.slug}/index.md · {termIds.length} clickable glossary terms ·{" "}
                            {ch.audioLines.length} dialogue lines
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeChapter ? (
            <div>
              {/* Quiet metadata header bar */}
              <div className="px-6 sm:px-10 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>book/{activeChapter.slug}/index.md</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeTermsCount} glossary links</span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenInWorkspace(`book/${activeChapter.slug}/index.md`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Edit Markdown Source</span>
                </button>
              </div>

              {/* Chapter Content */}
              <div className="p-6 sm:p-10">
                <HyperbookRenderer
                  markdown={activeChapter.markdown}
                  chapterSlug={activeChapter.slug}
                  audioLines={activeChapter.audioLines}
                  glossary={project.glossary}
                  h5pGames={project.h5pGames}
                  sandboxResponses={project.sandboxResponses}
                  onSandboxChange={onSandboxChange}
                  onSelectGlossaryId={onSelectGlossaryId}
                  onUpdateH5PGame={onUpdateH5PGame}
                />

                {/* Previous / Next Chapter Pagination */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
                  {activeChapterIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectChapter(sortedChapters[activeChapterIndex - 1].slug)
                      }
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{sortedChapters[activeChapterIndex - 1].name}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectChapter("index")}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-sky-700 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Book Overview</span>
                    </button>
                  )}

                  {activeChapterIndex < sortedChapters.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectChapter(sortedChapters[activeChapterIndex + 1].slug)
                      }
                      className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors ml-auto"
                    >
                      <span>{sortedChapters[activeChapterIndex + 1].name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
