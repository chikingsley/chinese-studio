import { ArrowUpRight, Plus, Search, Trash2, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ChapterFile, GlossaryEntry } from "../types/hyperbook";
import {
  findChaptersReferencingTerm,
  parseFrontmatter,
  parseInline,
} from "../utils/markdownParser";
import { speakText } from "../utils/speech";

interface GlossaryViewProps {
  glossary: GlossaryEntry[];
  chapters: ChapterFile[];
  selectedGlossaryId: string | null;
  onSelectGlossaryId: (id: string) => void;
  onUpdateEntry: (updated: GlossaryEntry) => void;
  onCreateEntry: (entry: GlossaryEntry, addToVocab?: { hanzi: string; pinyin: string; english: string; meta_note: string }) => void;
  onDeleteEntry: (id: string) => void;
  onNavigateChapter: (slug: string) => void;
}

export function GlossaryView({
  glossary,
  chapters,
  selectedGlossaryId,
  onSelectGlossaryId,
  onUpdateEntry,
  onCreateEntry,
  onDeleteEntry,
  onNavigateChapter,
}: GlossaryViewProps) {
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New term form state
  const [newId, setNewId] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newLiteral, setNewLiteral] = useState("");
  const [newMetaNote, setNewMetaNote] = useState("");
  const [syncToVocab, setSyncToVocab] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return glossary;
    return glossary.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        g.markdown.toLowerCase().includes(q)
    );
  }, [glossary, search]);

  const activeEntry =
    glossary.find((g) => g.id === selectedGlossaryId) || filtered[0] || null;

  const backlinks = activeEntry
    ? findChaptersReferencingTerm(chapters, activeEntry.id)
    : [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId =
      newId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") ||
      `term-${Date.now().toString(36)}`;

    const displayName = newReading.trim()
      ? `${newTerm.trim()} (${newReading.trim()})`
      : newTerm.trim();

    const markdown = `---
name: ${displayName}
---

**Meaning:** ${newMeaning.trim() || "—"}
**Literal:** ${newLiteral.trim() || "—"}

**Meta-Note / Connection:**
${newMetaNote.trim() || "Reusable concept node linked across chapters."}`;

    const entry: GlossaryEntry = {
      id: cleanId,
      name: displayName,
      markdown,
    };

    onCreateEntry(
      entry,
      syncToVocab
        ? {
            hanzi: newTerm.trim(),
            pinyin: newReading.trim(),
            english: newMeaning.trim(),
            meta_note: newMetaNote.trim() || newLiteral.trim(),
          }
        : undefined
    );

    setNewId("");
    setNewTerm("");
    setNewReading("");
    setNewMeaning("");
    setNewLiteral("");
    setNewMetaNote("");
    setShowNewForm(false);
    onSelectGlossaryId(cleanId);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-semibold text-slate-900">
            Glossary & Concept Nodes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Every file in <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">glossary/*.md</code> acts as a reusable node clickable via{" "}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">:t[Term]&#123;#id&#125;</code> across all chapters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{showNewForm ? "Close Form" : "New Glossary Node"}</span>
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-editorial text-xl font-semibold text-slate-900">
            Create Reusable Glossary Card
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Term (e.g. 咖啡)</span>
              <input
                required
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="咖啡"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Reading / Pinyin</span>
              <input
                type="text"
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                placeholder="kāfēi"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">
                File ID (glossary/&lt;id&gt;.md)
              </span>
              <input
                required
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="kafei"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Meaning</span>
              <input
                required
                type="text"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Coffee"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Literal Breakdown</span>
              <input
                type="text"
                value={newLiteral}
                onChange={(e) => setNewLiteral(e.target.value)}
                placeholder="Phonetic loanword with mouth radical 口"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Meta-Note / Connection</span>
            <textarea
              rows={2}
              value={newMetaNote}
              onChange={(e) => setNewMetaNote(e.target.value)}
              placeholder="Pair with measure word 一杯 (yī bēi, one cup)."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-sky-600"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={syncToVocab}
                onChange={(e) => setSyncToVocab(e.target.checked)}
                className="rounded border-slate-300 text-sky-700"
              />
              <span>Also add row to master data/vocab.csv (FSRS deck)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
              >
                Save Glossary Node
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8 items-start">
        {/* Glossary List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter glossary cards..."
              aria-label="Filter glossary cards"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-600"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filtered.map((entry) => {
              const refs = findChaptersReferencingTerm(chapters, entry.id);
              const isSelected = activeEntry?.id === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    onSelectGlossaryId(entry.id);
                    setEditMode(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    isSelected ? "bg-sky-50 text-sky-950" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="text-sm font-semibold">{entry.name}</div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                    #{entry.id} · {refs.length} {refs.length === 1 ? "chapter" : "chapters"}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No matching glossary cards.
              </p>
            )}
          </div>
        </div>

        {/* Selected Node Detail & Markdown Editor */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {activeEntry ? (
            <>
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    glossary/{activeEntry.id}.md · Embed via{" "}
                    <code className="text-sky-800">
                      :t[{activeEntry.name.split("(")[0].trim()}]&#123;#{activeEntry.id}&#125;
                    </code>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1">
                    <h2 className="font-editorial text-2xl font-semibold text-slate-900">
                      {parseFrontmatter(activeEntry.markdown).meta.name || activeEntry.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => speakText(activeEntry.name.split("(")[0].trim())}
                      aria-label={`Pronounce ${activeEntry.name}`}
                      className="p-2 text-sky-700 hover:bg-sky-100/70 rounded-lg transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        !editMode ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Card View
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(true)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        editMode ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Edit Markdown
                    </button>
                  </div>

                  {glossary.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(activeEntry.id)}
                      aria-label={`Delete glossary card ${activeEntry.id}`}
                      className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {editMode ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600">
                      Raw Hyperbook Glossary Markdown (edits sync immediately across every chapter)
                    </label>
                    <textarea
                      value={activeEntry.markdown}
                      onChange={(e) => {
                        const nextMd = e.target.value;
                        const { meta } = parseFrontmatter(nextMd);
                        onUpdateEntry({
                          ...activeEntry,
                          name: meta.name || activeEntry.name,
                          markdown: nextMd,
                        });
                      }}
                      rows={12}
                      className="w-full font-mono text-sm p-4 bg-slate-50 focus:bg-white border border-slate-300 focus:border-sky-600 rounded-lg leading-relaxed text-slate-900"
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3 text-[15px] leading-relaxed text-slate-700 max-w-[68ch]">
                      {parseFrontmatter(activeEntry.markdown)
                        .body.split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, idx) => (
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
                                    className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono"
                                  >
                                    {node.value}
                                  </code>
                                );
                              }
                              return (
                                <span key={nIdx}>
                                  {node.type === "term" ? node.label : node.value}
                                </span>
                              );
                            })}
                          </p>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200 space-y-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Cross-Chapter Backlinks
                      </h3>
                      {backlinks.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                          {backlinks.map((ch) => (
                            <button
                              key={ch.slug}
                              type="button"
                              onClick={() => onNavigateChapter(ch.slug)}
                              className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {ch.name}
                                </div>
                                <div className="text-xs font-mono text-slate-500">
                                  book/{ch.slug}/index.md
                                </div>
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-sky-700 shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Not yet linked in any chapter. Insert{" "}
                          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                            :t[{activeEntry.name.split("(")[0].trim()}]&#123;#{activeEntry.id}&#125;
                          </code>{" "}
                          in any chapter Markdown to activate popup links.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              Select a glossary node to inspect or edit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
