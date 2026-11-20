import {
  Check,
  Copy,
  Eye,
  FileCode2,
  FileText,
  FolderOpen,
  Terminal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BUILD_ANKI_PY } from "../data/starterProject";
import { H5PGameFile, TextbookProject } from "../types/hyperbook";
import { buildH5PContentJson } from "../utils/exportProject";
import {
  parseFrontmatter,
  parseVocabCsv,
  serializeVocabCsv,
} from "../utils/markdownParser";
import { HyperbookRenderer } from "./HyperbookRenderer";

interface WorkspaceViewProps {
  project: TextbookProject;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  onUpdateHomeMarkdown: (md: string) => void;
  onUpdateChapterMarkdown: (slug: string, md: string) => void;
  onUpdateGlossaryMarkdown: (id: string, md: string) => void;
  onUpdateVocabFromCsv: (csv: string) => void;
  onUpdateConfigJson: (jsonStr: string) => void;
  onUpdateH5PGame: (updated: H5PGameFile) => void;
  onSelectGlossaryId: (id: string) => void;
  onSandboxChange: (key: string, value: string) => void;
}

const HYPERBOOK_SNIPPETS = [
  { label: "Glossary Link", snippet: ":t[你好]{#nihao}" },
  {
    label: "Collapsible",
    snippet: '\n:::collapsible{title="Show Translation & Notes"}\n- Note here\n:::\n',
  },
  {
    label: "Fill-in-Blank",
    snippet: "\n:::multievent\nWrite {t{谢谢}} (pinyin: {t{xiexie}}).\n:::\n",
  },
  { label: "Audio", snippet: '\n::audio{src="./dialogue.mp3"}\n' },
  { label: "H5P Game", snippet: '\n::h5p{src="/ch01-drag-match.h5p"}\n' },
  {
    label: "Text Sandbox",
    snippet: '\n::textinput{placeholder="Type your response here..."}\n',
  },
];

export function WorkspaceView({
  project,
  selectedPath,
  onSelectPath,
  onUpdateHomeMarkdown,
  onUpdateChapterMarkdown,
  onUpdateGlossaryMarkdown,
  onUpdateVocabFromCsv,
  onUpdateConfigJson,
  onUpdateH5PGame,
  onSelectGlossaryId,
  onSandboxChange,
}: WorkspaceViewProps) {
  const [showSplitPreview, setShowSplitPreview] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);

  const fileList = useMemo(() => {
    const items: { path: string; folder: string; label: string }[] = [
      { path: "hyperbook.json", folder: "root", label: "hyperbook.json" },
      { path: "book/index.md", folder: "book/", label: "index.md" },
      ...project.chapters
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((c) => ({
          path: `book/${c.slug}/index.md`,
          folder: "book/",
          label: `${c.slug}/index.md`,
        })),
      ...project.glossary.map((g) => ({
        path: `glossary/${g.id}.md`,
        folder: "glossary/",
        label: `${g.id}.md`,
      })),
      ...project.h5pGames.map((h) => ({
        path: `public/${h.filename}`,
        folder: "public/",
        label: h.filename,
      })),
      { path: "data/vocab.csv", folder: "data/", label: "vocab.csv" },
      { path: "data/build_anki.py", folder: "data/", label: "build_anki.py" },
    ];
    return items;
  }, [project]);

  const activeContent = useMemo(() => {
    if (selectedPath === "hyperbook.json") {
      return JSON.stringify(project.config, null, 2);
    }
    if (selectedPath === "book/index.md") {
      return project.homeMarkdown;
    }
    if (selectedPath.startsWith("book/") && selectedPath.endsWith("/index.md")) {
      const slug = selectedPath.replace(/^book\//, "").replace(/\/index\.md$/, "");
      return project.chapters.find((c) => c.slug === slug)?.markdown ?? "";
    }
    if (selectedPath.startsWith("glossary/")) {
      const id = selectedPath.replace(/^glossary\//, "").replace(/\.md$/, "");
      return project.glossary.find((g) => g.id === id)?.markdown ?? "";
    }
    if (selectedPath.startsWith("public/")) {
      const filename = selectedPath.replace(/^public\//, "");
      const game = project.h5pGames.find((g) => g.filename === filename);
      return game ? JSON.stringify(buildH5PContentJson(game), null, 2) : "{}";
    }
    if (selectedPath === "data/vocab.csv") {
      return serializeVocabCsv(project.vocab);
    }
    if (selectedPath === "data/build_anki.py") {
      return BUILD_ANKI_PY;
    }
    return "";
  }, [project, selectedPath]);

  const isMarkdownBookFile =
    selectedPath === "book/index.md" ||
    (selectedPath.startsWith("book/") && selectedPath.endsWith("/index.md"));

  const isReadOnly = selectedPath === "data/build_anki.py";

  const handleEditorChange = (nextValue: string) => {
    setJsonError(null);
    if (selectedPath === "hyperbook.json") {
      try {
        JSON.parse(nextValue);
        onUpdateConfigJson(nextValue);
      } catch {
        setJsonError("hyperbook.json must remain valid JSON.");
      }
      return;
    }
    if (selectedPath === "book/index.md") {
      onUpdateHomeMarkdown(nextValue);
      return;
    }
    if (selectedPath.startsWith("book/") && selectedPath.endsWith("/index.md")) {
      const slug = selectedPath.replace(/^book\//, "").replace(/\/index\.md$/, "");
      onUpdateChapterMarkdown(slug, nextValue);
      return;
    }
    if (selectedPath.startsWith("glossary/")) {
      const id = selectedPath.replace(/^glossary\//, "").replace(/\.md$/, "");
      onUpdateGlossaryMarkdown(id, nextValue);
      return;
    }
    if (selectedPath === "data/vocab.csv") {
      if (parseVocabCsv(nextValue).length > 0 || nextValue.trim().split("\n").length <= 1) {
        onUpdateVocabFromCsv(nextValue);
      }
      return;
    }
    if (selectedPath.startsWith("public/")) {
      const filename = selectedPath.replace(/^public\//, "");
      const game = project.h5pGames.find((g) => g.filename === filename);
      if (!game) return;
      try {
        const parsed = JSON.parse(nextValue);
        if (Array.isArray(parsed.pairs)) {
          onUpdateH5PGame({
            ...game,
            pairs: parsed.pairs,
            dragSentences:
              typeof parsed.textField === "string"
                ? parsed.textField
                    .split(/\n+/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : game.dragSentences,
          });
        }
      } catch {
        setJsonError("Invalid H5P content.json syntax.");
      }
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!isMarkdownBookFile) return;
    handleEditorChange(`${activeContent}\n${snippet}`);
  };

  const activeChapterObj = useMemo(() => {
    if (!selectedPath.startsWith("book/") || selectedPath === "book/index.md") return null;
    const slug = selectedPath.replace(/^book\//, "").replace(/\/index\.md$/, "");
    return project.chapters.find((c) => c.slug === slug) ?? null;
  }, [project.chapters, selectedPath]);

  const folders = ["root", "book/", "glossary/", "public/", "data/"];

  const cliSnippet = `npm create hyperbook\ncd my-textbook\nnpx hyperbook dev\nnpx hyperbook build`;

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliSnippet);
      setCopiedCli(true);
      window.setTimeout(() => setCopiedCli(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-semibold text-slate-900">
            Project File Workspace
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect and edit the exact <code className="font-mono text-xs">my-textbook/</code>{" "}
            folder layout. Changes sync live to the Reader, Glossary, H5P games, and FSRS deck.
          </p>
        </div>

        {isMarkdownBookFile && (
          <button
            type="button"
            onClick={() => setShowSplitPreview((p) => !p)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            <span>{showSplitPreview ? "Hide Live Preview" : "Show Live Preview"}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Virtual Project Tree */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 font-mono pb-2 border-b border-slate-100">
            <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
            <span>my-textbook/</span>
          </div>

          <div className="space-y-3">
            {folders.map((folder) => {
              const entries = fileList.filter((f) => f.folder === folder);
              if (entries.length === 0) return null;
              return (
                <div key={folder} className="space-y-0.5">
                  {folder !== "root" && (
                    <div className="px-2 py-1 text-xs font-mono font-medium text-slate-500">
                      {folder}
                    </div>
                  )}
                  {entries.map((entry) => {
                    const active = selectedPath === entry.path;
                    return (
                      <button
                        key={entry.path}
                        type="button"
                        onClick={() => {
                          onSelectPath(entry.path);
                          setJsonError(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors ${
                          active
                            ? "bg-sky-50 text-sky-800 font-medium"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {entry.path.endsWith(".md") ? (
                          <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        ) : (
                          <FileCode2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{entry.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Local CLI reference */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Run Locally</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="text-xs text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"
              >
                {copiedCli ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
              <code>{cliSnippet}</code>
            </pre>
          </div>
        </aside>

        {/* Right Editor (+ Optional Live Preview) */}
        <div
          className={`grid gap-6 ${
            isMarkdownBookFile && showSplitPreview
              ? "grid-cols-1 xl:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-medium text-slate-800">
                my-textbook/{selectedPath}
              </span>
              <span className="text-xs text-slate-500">
                {isReadOnly
                  ? "Read-only template"
                  : selectedPath.startsWith("public/")
                  ? "H5P content/content.json"
                  : "Live editable"}
              </span>
            </div>

            {isMarkdownBookFile && (
              <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 mr-1">Insert directive:</span>
                {HYPERBOOK_SNIPPETS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => insertSnippet(item.snippet)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-800 rounded-md transition-colors whitespace-nowrap"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={activeContent}
              readOnly={isReadOnly}
              onChange={(e) => handleEditorChange(e.target.value)}
              rows={24}
              aria-label={`Editor for ${selectedPath}`}
              className="w-full flex-1 p-4 font-mono text-[13px] leading-relaxed text-slate-900 bg-white focus:outline-none resize-y min-h-[540px]"
            />

            {jsonError && (
              <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 text-xs font-medium text-red-700">
                {jsonError}
              </div>
            )}
          </div>

          {isMarkdownBookFile && showSplitPreview && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  Live Hyperbook Preview
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {parseFrontmatter(activeContent).meta.name || selectedPath}
                </span>
              </div>
              <div className="p-6 overflow-y-auto max-h-[620px]">
                <HyperbookRenderer
                  markdown={activeContent}
                  chapterSlug={activeChapterObj?.slug || "index"}
                  audioLines={activeChapterObj?.audioLines || []}
                  glossary={project.glossary}
                  h5pGames={project.h5pGames}
                  sandboxResponses={project.sandboxResponses}
                  onSandboxChange={onSandboxChange}
                  onSelectGlossaryId={onSelectGlossaryId}
                  onUpdateH5PGame={onUpdateH5PGame}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
