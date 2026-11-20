import { useEffect, useState } from "react";
import { ConvertView } from "./components/ConvertView";
import { FlashcardsView } from "./components/FlashcardsView";
import { GlossaryPopover } from "./components/GlossaryPopover";
import { GlossaryView } from "./components/GlossaryView";
import { ReaderView } from "./components/ReaderView";
import { TopBar } from "./components/TopBar";
import { WorkspaceView } from "./components/WorkspaceView";
import { STARTER_PROJECT } from "./data/starterProject";
import {
  AppSection,
  ConvertedChapterPayload,
  FSRSCardState,
  GlossaryEntry,
  H5PGameFile,
  TextbookProject,
  VocabRow,
} from "./types/hyperbook";
import { downloadFullHyperbookZip } from "./utils/exportProject";
import { parseFrontmatter, parseVocabCsv } from "./utils/markdownParser";

const STORAGE_KEY = "hyperbook-studio-project-v1";

function loadProject(): TextbookProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return STARTER_PROJECT;
    const parsed = JSON.parse(raw) as Partial<TextbookProject>;
    if (!parsed.chapters || !parsed.glossary || !parsed.vocab) {
      return STARTER_PROJECT;
    }
    return {
      ...STARTER_PROJECT,
      ...parsed,
      fsrsStates: parsed.fsrsStates ?? {},
      sandboxResponses: parsed.sandboxResponses ?? {},
    };
  } catch {
    return STARTER_PROJECT;
  }
}

export default function App() {
  const [project, setProject] = useState<TextbookProject>(loadProject);
  const [activeSection, setActiveSection] = useState<AppSection>("reader");
  const [activeChapterSlug, setActiveChapterSlug] = useState<string>("chapter-01");
  const [popoverGlossaryId, setPopoverGlossaryId] = useState<string | null>(null);
  const [selectedGlossaryId, setSelectedGlossaryId] = useState<string | null>(
    STARTER_PROJECT.glossary[0]?.id ?? null
  );
  const [workspacePath, setWorkspacePath] = useState<string>(
    "book/chapter-01/index.md"
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // ignore storage quota failures
    }
  }, [project]);

  const handleExportProject = async () => {
    setIsExporting(true);
    try {
      await downloadFullHyperbookZip(project);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSandboxChange = (key: string, value: string) => {
    setProject((prev) => ({
      ...prev,
      sandboxResponses: { ...prev.sandboxResponses, [key]: value },
    }));
  };

  const handleUpdateH5PGame = (updated: H5PGameFile) => {
    setProject((prev) => ({
      ...prev,
      h5pGames: prev.h5pGames.map((g) =>
        g.filename === updated.filename ? updated : g
      ),
    }));
  };

  const handleUpdateChapterMarkdown = (slug: string, markdown: string) => {
    const { meta } = parseFrontmatter(markdown);
    setProject((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) =>
        ch.slug === slug
          ? {
              ...ch,
              markdown,
              name: meta.name || ch.name,
              index: meta.index ? Number(meta.index) || ch.index : ch.index,
            }
          : ch
      ),
    }));
  };

  const handleUpdateGlossaryEntry = (updated: GlossaryEntry) => {
    setProject((prev) => ({
      ...prev,
      glossary: prev.glossary.map((g) => (g.id === updated.id ? updated : g)),
    }));
  };

  const handleUpdateGlossaryMarkdown = (id: string, markdown: string) => {
    const { meta } = parseFrontmatter(markdown);
    setProject((prev) => ({
      ...prev,
      glossary: prev.glossary.map((g) =>
        g.id === id ? { ...g, markdown, name: meta.name || g.name } : g
      ),
    }));
  };

  const handleCreateGlossaryEntry = (
    entry: GlossaryEntry,
    vocabSync?: { hanzi: string; pinyin: string; english: string; meta_note: string }
  ) => {
    setProject((prev) => {
      const exists = prev.glossary.some((g) => g.id === entry.id);
      const nextGlossary = exists
        ? prev.glossary.map((g) => (g.id === entry.id ? entry : g))
        : [...prev.glossary, entry];

      const nextVocab = vocabSync
        ? [
            ...prev.vocab,
            {
              id: `v-${Date.now().toString(36)}`,
              hanzi: vocabSync.hanzi,
              pinyin: vocabSync.pinyin,
              english: vocabSync.english,
              chapter: Math.max(1, prev.chapters.length),
              meta_note: vocabSync.meta_note,
            },
          ]
        : prev.vocab;

      return { ...prev, glossary: nextGlossary, vocab: nextVocab };
    });
  };

  const handleDeleteGlossaryEntry = (id: string) => {
    setProject((prev) => ({
      ...prev,
      glossary: prev.glossary.filter((g) => g.id !== id),
    }));
    if (selectedGlossaryId === id) {
      setSelectedGlossaryId(null);
    }
  };

  const handleRateCard = (vocabId: string, nextState: FSRSCardState) => {
    setProject((prev) => ({
      ...prev,
      fsrsStates: { ...prev.fsrsStates, [vocabId]: nextState },
    }));
  };

  const handleResetFSRS = () => {
    setProject((prev) => ({ ...prev, fsrsStates: {} }));
  };

  const handleAddVocab = (row: Omit<VocabRow, "id">) => {
    setProject((prev) => ({
      ...prev,
      vocab: [...prev.vocab, { ...row, id: `v-${Date.now().toString(36)}` }],
    }));
  };

  const handleUpdateVocab = (updated: VocabRow) => {
    setProject((prev) => ({
      ...prev,
      vocab: prev.vocab.map((v) => (v.id === updated.id ? updated : v)),
    }));
  };

  const handleDeleteVocab = (id: string) => {
    setProject((prev) => ({
      ...prev,
      vocab: prev.vocab.filter((v) => v.id !== id),
    }));
  };

  const handleUpdateVocabFromCsv = (csv: string) => {
    const parsed = parseVocabCsv(csv);
    setProject((prev) => ({ ...prev, vocab: parsed }));
  };

  const handleUpdateConfigJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setProject((prev) => ({
        ...prev,
        config: { ...prev.config, ...parsed },
      }));
    } catch {
      // handled by workspace editor
    }
  };

  const handleAddConvertedChapter = (payload: ConvertedChapterPayload) => {
    const cleanSlug = payload.chapter.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    setProject((prev) => {
      const chaptersWithoutDup = prev.chapters.filter((c) => c.slug !== cleanSlug);
      const nextChapters = [
        ...chaptersWithoutDup,
        {
          slug: cleanSlug,
          index: payload.chapter.index,
          name: payload.chapter.name,
          markdown: payload.chapter.markdown,
          audioLines: payload.chapter.audioLines || [],
        },
      ].sort((a, b) => a.index - b.index);

      const glossaryMap = new Map(prev.glossary.map((g) => [g.id, g]));
      for (const term of payload.glossaryTerms) {
        glossaryMap.set(term.id, {
          id: term.id,
          name: term.name,
          markdown: term.markdown,
        });
      }

      const h5pGame: H5PGameFile = {
        filename: payload.h5pGame.filename,
        title: payload.h5pGame.title,
        defaultMode: (["drag-words", "match-up", "memory", "dialog-cards"].includes(
          payload.h5pGame.defaultMode
        )
          ? payload.h5pGame.defaultMode
          : "drag-words") as H5PGameFile["defaultMode"],
        pairs: payload.h5pGame.pairs.map((p, idx) => ({
          ...p,
          id: `${cleanSlug}-p${idx}`,
        })),
        dragSentences: payload.h5pGame.dragSentences || [],
      };
      const nextGames = [
        ...prev.h5pGames.filter((g) => g.filename !== h5pGame.filename),
        h5pGame,
      ];

      const existingHanzi = new Set(prev.vocab.map((v) => v.hanzi));
      const addedVocab: VocabRow[] = payload.vocabRows
        .filter((v) => !existingHanzi.has(v.hanzi))
        .map((v, idx) => ({
          ...v,
          id: `v-${cleanSlug}-${idx}-${Date.now().toString(36)}`,
        }));

      return {
        ...prev,
        chapters: nextChapters,
        glossary: Array.from(glossaryMap.values()),
        h5pGames: nextGames,
        vocab: [...prev.vocab, ...addedVocab],
      };
    });

    setActiveChapterSlug(cleanSlug);
    setActiveSection("reader");
  };

  const popoverEntry =
    popoverGlossaryId !== null
      ? project.glossary.find((g) => g.id === popoverGlossaryId) ?? {
          id: popoverGlossaryId,
          name: `#${popoverGlossaryId}`,
          markdown: `---\nname: #${popoverGlossaryId}\n---\n\nThis term is referenced in the chapter but does not yet have a file in \`glossary/${popoverGlossaryId}.md\`.`,
        }
      : null;

  const nextChapterIndex =
    project.chapters.reduce((max, c) => Math.max(max, c.index), 0) + 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onExportProject={handleExportProject}
        isExporting={isExporting}
      />

      <div className="flex-1">
        {activeSection === "reader" && (
          <ReaderView
            project={project}
            activeChapterSlug={activeChapterSlug}
            onSelectChapter={setActiveChapterSlug}
            onSelectGlossaryId={setPopoverGlossaryId}
            onSandboxChange={handleSandboxChange}
            onUpdateH5PGame={handleUpdateH5PGame}
            onOpenInWorkspace={(filePath) => {
              setWorkspacePath(filePath);
              setActiveSection("workspace");
            }}
            onGoToConvert={() => setActiveSection("convert")}
          />
        )}

        {activeSection === "glossary" && (
          <GlossaryView
            glossary={project.glossary}
            chapters={project.chapters}
            selectedGlossaryId={selectedGlossaryId}
            onSelectGlossaryId={setSelectedGlossaryId}
            onUpdateEntry={handleUpdateGlossaryEntry}
            onCreateEntry={handleCreateGlossaryEntry}
            onDeleteEntry={handleDeleteGlossaryEntry}
            onNavigateChapter={(slug) => {
              setActiveChapterSlug(slug);
              setActiveSection("reader");
            }}
          />
        )}

        {activeSection === "flashcards" && (
          <FlashcardsView
            vocab={project.vocab}
            fsrsStates={project.fsrsStates}
            onRateCard={handleRateCard}
            onResetFSRS={handleResetFSRS}
            onAddVocab={handleAddVocab}
            onUpdateVocab={handleUpdateVocab}
            onDeleteVocab={handleDeleteVocab}
          />
        )}

        {activeSection === "workspace" && (
          <WorkspaceView
            project={project}
            selectedPath={workspacePath}
            onSelectPath={setWorkspacePath}
            onUpdateHomeMarkdown={(homeMarkdown) =>
              setProject((prev) => ({ ...prev, homeMarkdown }))
            }
            onUpdateChapterMarkdown={handleUpdateChapterMarkdown}
            onUpdateGlossaryMarkdown={handleUpdateGlossaryMarkdown}
            onUpdateVocabFromCsv={handleUpdateVocabFromCsv}
            onUpdateConfigJson={handleUpdateConfigJson}
            onUpdateH5PGame={handleUpdateH5PGame}
            onSelectGlossaryId={setPopoverGlossaryId}
            onSandboxChange={handleSandboxChange}
          />
        )}

        {activeSection === "convert" && (
          <ConvertView
            nextChapterIndex={nextChapterIndex}
            onAddConvertedChapter={handleAddConvertedChapter}
          />
        )}
      </div>

      {/* Quiet minimal footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Hyperbook Studio · Open-source Markdown textbook, H5P drills, and FSRS meta-flashcarding
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setProject(STARTER_PROJECT);
                setActiveChapterSlug("chapter-01");
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Reset Starter Textbook
            </button>
          </div>
        </div>
      </footer>

      <GlossaryPopover
        entry={popoverEntry}
        chapters={project.chapters}
        onClose={() => setPopoverGlossaryId(null)}
        onNavigateChapter={(slug) => {
          setActiveChapterSlug(slug);
          setActiveSection("reader");
        }}
        onOpenInGlossary={(id) => {
          setSelectedGlossaryId(id);
          setActiveSection("glossary");
        }}
        onPracticeFlashcards={() => setActiveSection("flashcards")}
      />
    </div>
  );
}
