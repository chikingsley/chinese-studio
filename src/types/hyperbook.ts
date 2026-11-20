export type AppSection = "reader" | "glossary" | "flashcards" | "workspace" | "convert";

export type H5PMode = "drag-words" | "match-up" | "memory" | "dialog-cards";

export interface HyperbookConfig {
  name: string;
  description: string;
  language: string;
  search: boolean;
  importExport: boolean;
  repoUrl: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  reading: string;
  translation: string;
}

export interface ChapterFile {
  slug: string; // e.g., "chapter-01"
  index: number;
  name: string;
  markdown: string;
  audioLines: DialogueLine[];
}

export interface GlossaryEntry {
  id: string; // filename without .md, e.g. "nihao"
  name: string;
  markdown: string;
}

export interface H5PPair {
  id: string;
  term: string;
  reading: string;
  meaning: string;
  hint: string;
}

export interface H5PGameFile {
  filename: string; // e.g., "ch01-drag-match.h5p"
  title: string;
  defaultMode: H5PMode;
  pairs: H5PPair[];
  dragSentences: string[]; // words surrounded by *...* become blanks
}

export interface VocabRow {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  chapter: number;
  meta_note: string;
}

export type FSRSRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

export type FSRSCardStatus = "new" | "learning" | "review" | "relearning";

export interface FSRSCardState {
  vocabId: string;
  stability: number; // days
  difficulty: number; // 1..10
  reps: number;
  lapses: number;
  state: FSRSCardStatus;
  due: number; // epoch ms
  lastReview: number | null;
}

export interface TextbookProject {
  config: HyperbookConfig;
  homeMarkdown: string;
  chapters: ChapterFile[];
  glossary: GlossaryEntry[];
  h5pGames: H5PGameFile[];
  vocab: VocabRow[];
  fsrsStates: Record<string, FSRSCardState>;
  sandboxResponses: Record<string, string>; // key: `${chapterSlug}:${blockIdx}`
}

export interface ConvertedChapterPayload {
  chapter: {
    slug: string;
    index: number;
    name: string;
    markdown: string;
    audioLines: DialogueLine[];
  };
  glossaryTerms: {
    id: string;
    name: string;
    markdown: string;
  }[];
  h5pGame: {
    filename: string;
    title: string;
    defaultMode: H5PMode;
    pairs: Omit<H5PPair, "id">[];
    dragSentences: string[];
  };
  vocabRows: Omit<VocabRow, "id">[];
}
