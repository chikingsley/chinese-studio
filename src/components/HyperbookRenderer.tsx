import { CheckCircle2, ChevronDown, ChevronRight, HelpCircle, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { ChapterFile, GlossaryEntry, H5PGameFile } from "../types/hyperbook";
import {
  HyperbookBlock,
  InlineNode,
  MultieventPart,
  normalizeAnswerForComparison,
  parseHyperbookMarkdown,
} from "../utils/markdownParser";
import { DialogueAudioPlayer } from "./DialogueAudioPlayer";
import { H5PGameWidget } from "./H5PGameWidget";

interface HyperbookRendererProps {
  markdown: string;
  chapterSlug: string;
  audioLines: ChapterFile["audioLines"];
  glossary: GlossaryEntry[];
  h5pGames: H5PGameFile[];
  sandboxResponses: Record<string, string>;
  onSandboxChange: (key: string, value: string) => void;
  onSelectGlossaryId: (id: string) => void;
  onUpdateH5PGame: (updated: H5PGameFile) => void;
}

function InlineNodes({
  nodes,
  glossaryMap,
  onSelectGlossaryId,
}: {
  nodes: InlineNode[];
  glossaryMap: Map<string, GlossaryEntry>;
  onSelectGlossaryId: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((node, idx) => {
        if (node.type === "text") return <span key={idx}>{node.value}</span>;
        if (node.type === "bold") {
          return (
            <strong key={idx} className="font-semibold text-slate-900">
              {node.value}
            </strong>
          );
        }
        if (node.type === "italic") {
          return (
            <em key={idx} className="italic text-slate-600">
              {node.value}
            </em>
          );
        }
        if (node.type === "code") {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[13px] font-mono"
            >
              {node.value}
            </code>
          );
        }
        const exists = glossaryMap.has(node.id);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectGlossaryId(node.id)}
            title={
              exists
                ? `Open glossary card for ${node.label}`
                : `Glossary entry #${node.id} not found yet`
            }
            className="inline font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 border-b border-dashed border-sky-500 px-1 rounded-xs transition-colors"
          >
            {node.label}
          </button>
        );
      })}
    </>
  );
}

function CollapsibleBlock({
  title,
  blocks,
  glossaryMap,
  onSelectGlossaryId,
}: {
  title: string;
  blocks: HyperbookBlock[];
  glossaryMap: Map<string, GlossaryEntry>;
  onSelectGlossaryId: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-5 border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 space-y-2.5 text-[15px] leading-relaxed text-slate-700">
          {blocks.map((block, bIdx) => {
            if (block.type === "list") {
              return (
                <ul key={bIdx} className="space-y-2 list-disc pl-5">
                  {block.items.map((item, iIdx) => (
                    <li key={iIdx}>
                      <InlineNodes
                        nodes={item}
                        glossaryMap={glossaryMap}
                        onSelectGlossaryId={onSelectGlossaryId}
                      />
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "paragraph") {
              return (
                <p key={bIdx}>
                  <InlineNodes
                    nodes={block.nodes}
                    glossaryMap={glossaryMap}
                    onSelectGlossaryId={onSelectGlossaryId}
                  />
                </p>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function MultieventBlock({ parts }: { parts: MultieventPart[] }) {
  const blanks = parts.filter((p): p is Extract<MultieventPart, { type: "blank" }> => p.type === "blank");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const correctCount = blanks.filter((b) => {
    const userVal = answers[b.blankIndex] || "";
    return normalizeAnswerForComparison(userVal) === normalizeAnswerForComparison(b.answer);
  }).length;

  return (
    <div className="my-5 p-5 bg-white border border-slate-200 rounded-xl space-y-4">
      <div className="text-[15px] leading-9 text-slate-800">
        {parts.map((part, idx) => {
          if (part.type === "text") {
            return <span key={idx}>{part.value}</span>;
          }
          const val = answers[part.blankIndex] ?? "";
          const isCorrect =
            checked &&
            normalizeAnswerForComparison(val) === normalizeAnswerForComparison(part.answer);
          const isWrong = checked && !isCorrect;

          return (
            <span key={idx} className="inline-flex items-center mx-1 align-baseline">
              <input
                type="text"
                value={showSolution ? part.answer : val}
                onChange={(e) => {
                  setShowSolution(false);
                  setChecked(false);
                  setAnswers((prev) => ({ ...prev, [part.blankIndex]: e.target.value }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setChecked(true);
                }}
                aria-label={`Fill in blank ${part.blankIndex + 1}`}
                placeholder="type answer..."
                style={{ width: `${Math.max(10, part.answer.length + 5)}ch` }}
                className={`px-2.5 py-0.5 text-sm font-mono rounded-md border transition-colors ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                    : isWrong
                    ? "bg-red-50 border-red-400 text-red-900"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-sky-600"
                }`}
              />
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowSolution(false);
              setChecked(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
          >
            Check
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSolution((s) => !s);
              setChecked(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showSolution ? "Hide Answers" : "Reveal Answers"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setChecked(false);
              setShowSolution(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>

        {checked && (
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${
              correctCount === blanks.length ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {correctCount === blanks.length ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>
              {correctCount} / {blanks.length} correct
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HyperbookRenderer({
  markdown,
  chapterSlug,
  audioLines,
  glossary,
  h5pGames,
  sandboxResponses,
  onSandboxChange,
  onSelectGlossaryId,
  onUpdateH5PGame,
}: HyperbookRendererProps) {
  const { blocks } = parseHyperbookMarkdown(markdown);
  const glossaryMap = new Map(glossary.map((g) => [g.id, g]));

  return (
    <article className="space-y-4">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                key={idx}
                className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 pb-2"
              >
                {block.text}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2
                key={idx}
                className="font-editorial text-xl sm:text-2xl font-semibold text-slate-900 pt-5 pb-1 border-b border-slate-200/80"
              >
                {block.text}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-lg font-semibold text-slate-900 pt-3">
              {block.text}
            </h3>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={idx} className="text-[16px] leading-[1.7] text-slate-700 max-w-[72ch]">
              <InlineNodes
                nodes={block.nodes}
                glossaryMap={glossaryMap}
                onSelectGlossaryId={onSelectGlossaryId}
              />
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={idx}
              className="list-disc pl-6 space-y-2 text-[15px] leading-[1.65] text-slate-700 max-w-[70ch]"
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>
                  <InlineNodes
                    nodes={item}
                    glossaryMap={glossaryMap}
                    onSelectGlossaryId={onSelectGlossaryId}
                  />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "audio") {
          return <DialogueAudioPlayer key={idx} src={block.src} lines={audioLines} />;
        }

        if (block.type === "collapsible") {
          return (
            <CollapsibleBlock
              key={idx}
              title={block.title}
              blocks={block.bodyBlocks}
              glossaryMap={glossaryMap}
              onSelectGlossaryId={onSelectGlossaryId}
            />
          );
        }

        if (block.type === "multievent") {
          return <MultieventBlock key={idx} parts={block.parts} />;
        }

        if (block.type === "h5p") {
          const cleanName = block.src.replace(/^\//, "");
          const matchingGame =
            h5pGames.find((g) => g.filename === cleanName) || h5pGames[0];
          if (!matchingGame) {
            return (
              <div
                key={idx}
                className="my-5 p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-600"
              >
                H5P package <code className="font-mono">{block.src}</code> not found in{" "}
                <code className="font-mono">public/</code>.
              </div>
            );
          }
          return (
            <H5PGameWidget
              key={idx}
              game={matchingGame}
              onUpdateGame={onUpdateH5PGame}
            />
          );
        }

        if (block.type === "textinput") {
          const storageKey = `${chapterSlug}:${block.blockIndex}`;
          const value = sandboxResponses[storageKey] ?? "";
          return (
            <div key={idx} className="my-4 bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
              <textarea
                value={value}
                onChange={(e) => onSandboxChange(storageKey, e.target.value)}
                placeholder={block.placeholder}
                rows={4}
                className="w-full text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-sky-600 rounded-lg p-3.5 transition-colors resize-y"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="tabular-nums">
                  {value.length} characters · Saved automatically in browser
                </span>
                {value.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSandboxChange(storageKey, "")}
                    className="text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Clear response
                  </button>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </article>
  );
}
