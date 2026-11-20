import { ChapterFile, VocabRow } from "../types/hyperbook";

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "term"; label: string; id: string };

export type MultieventPart =
  | { type: "text"; value: string }
  | { type: "blank"; answer: string; blankIndex: number };

export type HyperbookBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; nodes: InlineNode[] }
  | { type: "list"; items: InlineNode[][] }
  | { type: "audio"; src: string }
  | { type: "collapsible"; title: string; bodyBlocks: HyperbookBlock[] }
  | { type: "multievent"; parts: MultieventPart[]; raw: string }
  | { type: "h5p"; src: string }
  | { type: "textinput"; placeholder: string; blockIndex: number };

export interface ParsedFrontmatter {
  meta: Record<string, string>;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { meta: {}, body: normalized };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      meta[key] = val;
    }
  }

  return {
    meta,
    body: normalized.slice(match[0].length),
  };
}

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Matches :t[label]{#id}, **bold**, *italic*, `code`
  const tokenRegex =
    /(:t\[([^\]]+)\]\{#([a-zA-Z0-9_-]+)\}|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push({ type: "term", label: match[2], id: match[3] });
    } else if (match[4] !== undefined) {
      nodes.push({ type: "bold", value: match[4] });
    } else if (match[5] !== undefined) {
      nodes.push({ type: "italic", value: match[5] });
    } else if (match[6] !== undefined) {
      nodes.push({ type: "code", value: match[6] });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

function parseAttr(attrString: string, key: string): string {
  const regex = new RegExp(`${key}\\s*=\\s*"([^"]*)"`);
  const match = attrString.match(regex);
  if (match) return match[1];
  const singleRegex = new RegExp(`${key}\\s*=\\s*'([^']*)'`);
  const singleMatch = attrString.match(singleRegex);
  return singleMatch ? singleMatch[1] : "";
}

function parseMultieventContent(raw: string): MultieventPart[] {
  const parts: MultieventPart[] = [];
  const regex = /\{t\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let blankIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }
    parts.push({ type: "blank", answer: match[1].trim(), blankIndex });
    blankIndex += 1;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    parts.push({ type: "text", value: raw.slice(lastIndex) });
  }

  return parts;
}

export function parseHyperbookMarkdown(markdown: string): {
  meta: Record<string, string>;
  blocks: HyperbookBlock[];
} {
  const { meta, body } = parseFrontmatter(markdown);
  const blocks = parseBlocks(body);
  return { meta, blocks };
}

function parseBlocks(body: string): HyperbookBlock[] {
  const lines = body.split("\n");
  const blocks: HyperbookBlock[] = [];
  let i = 0;
  let textInputCounter = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Container directive :::collapsible{title="..."}
    if (trimmed.startsWith(":::collapsible")) {
      const title = parseAttr(trimmed, "title") || "Show Details";
      const innerLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        innerLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing :::
      blocks.push({
        type: "collapsible",
        title,
        bodyBlocks: parseBlocks(innerLines.join("\n")),
      });
      continue;
    }

    // Container directive :::multievent
    if (trimmed.startsWith(":::multievent")) {
      const innerLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        innerLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing :::
      const joined = innerLines.join("\n").trim();
      blocks.push({
        type: "multievent",
        raw: joined,
        parts: parseMultieventContent(joined),
      });
      continue;
    }

    // Leaf directive ::audio{src="..."}
    if (trimmed.startsWith("::audio")) {
      blocks.push({
        type: "audio",
        src: parseAttr(trimmed, "src") || "./dialogue.mp3",
      });
      i += 1;
      continue;
    }

    // Leaf directive ::h5p{src="..."}
    if (trimmed.startsWith("::h5p")) {
      blocks.push({
        type: "h5p",
        src: parseAttr(trimmed, "src") || "",
      });
      i += 1;
      continue;
    }

    // Leaf directive ::textinput{placeholder="..."}
    if (trimmed.startsWith("::textinput")) {
      blocks.push({
        type: "textinput",
        placeholder: parseAttr(trimmed, "placeholder") || "Write your response here...",
        blockIndex: textInputCounter,
      });
      textInputCounter += 1;
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: InlineNode[][] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        items.push(parseInline(lines[i].trim().slice(2).trim()));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Regular paragraph (accumulate consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("::") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ")
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        nodes: parseInline(paraLines.join(" ")),
      });
    } else {
      i += 1;
    }
  }

  return blocks;
}

export function extractReferencedGlossaryIds(markdown: string): string[] {
  const ids = new Set<string>();
  const regex = /:t\[[^\]]+\]\{#([a-zA-Z0-9_-]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

export function findChaptersReferencingTerm(
  chapters: ChapterFile[],
  glossaryId: string
): ChapterFile[] {
  return chapters.filter((ch) =>
    extractReferencedGlossaryIds(ch.markdown).includes(glossaryId)
  );
}

export function normalizeAnswerForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

// RFC-4180 compliant CSV serializer & parser for data/vocab.csv
function escapeCsvCell(val: string | number): string {
  const str = String(val ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeVocabCsv(rows: VocabRow[]): string {
  const header = "hanzi,pinyin,english,chapter,meta_note";
  const body = rows.map((r) =>
    [r.hanzi, r.pinyin, r.english, r.chapter, r.meta_note].map(escapeCsvCell).join(",")
  );
  return [header, ...body].join("\n");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function parseVocabCsv(csvText: string): VocabRow[] {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const rows: VocabRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [hanzi = "", pinyin = "", english = "", chapterRaw = "1", meta_note = ""] =
      splitCsvLine(lines[i]);
    if (!hanzi.trim() && !english.trim()) continue;
    const chapter = Math.max(1, parseInt(chapterRaw, 10) || 1);
    rows.push({
      id: `v-${i}-${hanzi.trim()}`,
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      english: english.trim(),
      chapter,
      meta_note: meta_note.trim(),
    });
  }
  return rows;
}
