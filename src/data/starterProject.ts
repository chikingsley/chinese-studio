import { TextbookProject } from "../types/hyperbook";

export const BUILD_ANKI_PY = `#!/usr/bin/env python3
"""
Generate an Anki (.apkg) deck with chapter tags from data/vocab.csv.
Enable FSRS in Anki Deck Options -> FSRS for optimal spaced repetition.

Usage:
    pip install genanki
    python data/build_anki.py
"""
import csv
from pathlib import Path
import genanki

MODEL_ID = 1607392319
DECK_ID = 2059400110

model = genanki.Model(
    MODEL_ID,
    "Hyperbook Meta-Flashcard",
    fields=[
        {"name": "Term"},
        {"name": "Reading"},
        {"name": "Meaning"},
        {"name": "MetaNote"},
    ],
    templates=[
        {
            "name": "Recognition",
            "qfmt": '<div class="term">{{Term}}</div>',
            "afmt": '{{FrontSide}}<hr id="answer"><div class="reading">{{Reading}}</div><div class="meaning">{{Meaning}}</div><div class="note">{{MetaNote}}</div>',
        }
    ],
    css="""
    .card { font-family: system-ui, sans-serif; text-align: center; color: #0f172a; background: #f8fafc; padding: 24px; }
    .term { font-size: 40px; font-weight: 600; margin-bottom: 12px; }
    .reading { font-size: 20px; color: #0284c7; font-family: monospace; margin-bottom: 8px; }
    .meaning { font-size: 22px; font-weight: 600; margin-bottom: 14px; }
    .note { font-size: 14px; color: #475569; max-width: 420px; margin: 0 auto; line-height: 1.5; }
    """,
)

deck = genanki.Deck(DECK_ID, "Hyperbook Master Vocab (FSRS)")
csv_path = Path(__file__).parent / "vocab.csv"

with csv_path.open(encoding="utf-8") as f:
    for row in csv.DictReader(f):
        chapter_tag = f"ch{int(row['chapter']):02d}"
        note = genanki.Note(
            model=model,
            fields=[row["hanzi"], row["pinyin"], row["english"], row["meta_note"]],
            tags=[chapter_tag, "hyperbook"],
        )
        deck.add_note(note)

out_path = Path(__file__).parent / "hyperbook_vocab.apkg"
genanki.Package(deck).write_to_file(str(out_path))
print(f"Exported {len(deck.notes)} cards to {out_path}")
`;

export const STARTER_PROJECT: TextbookProject = {
  config: {
    name: "Mandarin Foundations",
    description:
      "An open-source Hyperbook combining clean chapter explanations, reusable glossary nodes, H5P Wordwall games, and a unified FSRS flashcard deck.",
    language: "en",
    search: true,
    importExport: true,
    repoUrl: "https://github.com/openpatch/hyperbook",
  },
  homeMarkdown: `---
name: "Mandarin Foundations"
index: 0
---

# Mandarin Foundations

Welcome to your open-source interactive textbook powered by **Hyperbook**, **H5P** Wordwall-style drills, and a single master \`data/vocab.csv\` feeding your **FSRS** spaced-repetition deck.

## How This Book Works

- Click any highlighted term such as :t[你好]{#nihao} or :t[谢谢]{#xiexie} to inspect its reusable glossary card without leaving the page.
- Practice listening with inline dialogue audio, check understanding with fill-in-the-blank blocks, and play embedded H5P drag-and-drop or memory games.
- Every vocabulary item lives in one master \`data/vocab.csv\` file so you can review across all chapters at once instead of trapping flashcards inside individual lessons.
`,
  chapters: [
    {
      slug: "chapter-01",
      index: 1,
      name: "Chapter 1: Greetings & Basics",
      markdown: `---
name: "Chapter 1: Greetings & Basics"
index: 1
---

# Chapter 1: Greetings & Basics

## 1. Cleaned-up Explanation
In Mandarin, :t[你好]{#nihao} is the standard greeting, while :t[谢谢]{#xiexie} is used to thank someone. When addressing elders, teachers, or customers, switch to the respectful form :t[您好]{#ninhao}. If someone thanks you, the natural reply is :t[不客气]{#bukeqi}, and when parting ways you say :t[再见]{#zaijian}.

*(Clicking any highlighted Chinese term opens its reusable glossary card without leaving the page.)*

## 2. Dialogue Practice
::audio{src="./dialogue.mp3"}

:::collapsible{title="Show English Translation & Notes"}
- **A:** 你好！(Hello!) — Notice two 3rd tones (*nǐ hǎo*) shift in spoken speech so the first sounds like a rising 2nd tone (*ní hǎo*).
- **B:** 您好！谢谢！(Hello respectfully! Thank you!) — *xièxie* drops the second tone to a light neutral tone.
- **A:** 不客气，再见！(You're welcome, goodbye!) — Literally "no need to be overly polite; see you again."
:::

## 3. Quick Fill-in-the-Blank (Built into Hyperbook)
:::multievent
To say "thank you" in Chinese, you write {t{谢谢}} (pinyin: {t{xiexie}}). To reply "you're welcome", say {t{不客气}}.
:::

## 4. Wordwall-Style Drag & Drop Game (H5P)
::h5p{src="/ch01-drag-match.h5p"}

## 5. Free-Response Sandbox
Translate two greetings or farewells from the textbook below (saved automatically in your browser):
::textinput{placeholder="Type your Chinese sentences here... (e.g., 您好！谢谢你。不客气，再见！)"}
`,
      audioLines: [
        {
          speaker: "Speaker A",
          text: "你好！",
          reading: "Nǐ hǎo!",
          translation: "Hello!",
        },
        {
          speaker: "Speaker B",
          text: "您好！谢谢！",
          reading: "Nín hǎo! Xièxie!",
          translation: "Hello (polite)! Thank you!",
        },
        {
          speaker: "Speaker A",
          text: "不客气，再见！",
          reading: "Bú kèqi, zàijiàn!",
          translation: "You're welcome, goodbye!",
        },
      ],
    },
    {
      slug: "chapter-02",
      index: 2,
      name: "Chapter 2: Introductions & Polite Requests",
      markdown: `---
name: "Chapter 2: Introductions & Polite Requests"
index: 2
---

# Chapter 2: Introductions & Polite Requests

## 1. Starting a Conversation Politely
Building on :t[你好]{#nihao} from Chapter 1, you can soften any question by opening with :t[请问]{#qingwen}. To introduce your own name, use :t[我叫]{#wojiao} followed by your name. If you bump into someone or make a mistake, apologize with :t[对不起]{#duibuqi}, and reassure someone with :t[没关系]{#meiguanxi}.

## 2. Dialogue Practice
::audio{src="./dialogue.mp3"}

:::collapsible{title="Show English Translation & Notes"}
- **A:** 请问，您贵姓？(Excuse me, may I ask your surname?) — *qǐngwèn* literally means "invite + ask".
- **B:** 你好，我叫林明。(Hello, my name is Lin Ming.) — *jiào* literally means "to be called".
- **A:** 对不起，打扰了！(Sorry to bother you!)
- **B:** 没关系！(No problem / It doesn't matter!)
:::

## 3. Quick Fill-in-the-Blank (Built into Hyperbook)
:::multievent
Before asking a stranger a question, open politely with {t{请问}}. To say "my name is...", use {t{我叫}}, and to answer an apology say {t{没关系}}.
:::

## 4. Wordwall-Style Memory & Matching Game (H5P)
::h5p{src="/ch02-memory-match.h5p"}

## 5. Free-Response Sandbox
Write a short 2-line introduction dialogue using 请问 and 我叫 (saved automatically in your browser):
::textinput{placeholder="Example: 你好！请问，你叫什么名字？我叫..."}
`,
      audioLines: [
        {
          speaker: "Speaker A",
          text: "请问，你叫什么名字？",
          reading: "Qǐngwèn, nǐ jiào shénme míngzi?",
          translation: "Excuse me, what is your name?",
        },
        {
          speaker: "Speaker B",
          text: "你好，我叫林明。",
          reading: "Nǐ hǎo, wǒ jiào Lín Míng.",
          translation: "Hello, my name is Lin Ming.",
        },
        {
          speaker: "Speaker A",
          text: "对不起！",
          reading: "Duìbuqǐ!",
          translation: "I'm sorry!",
        },
        {
          speaker: "Speaker B",
          text: "没关系！",
          reading: "Méi guānxi!",
          translation: "No problem!",
        },
      ],
    },
  ],
  glossary: [
    {
      id: "nihao",
      name: "你好 (nǐ hǎo)",
      markdown: `---
name: 你好 (nǐ hǎo)
---

**Meaning:** Hello
**Literal:** You (你) + Good (好)

**Meta-Note / Connection:**
Compare with 您好 (*nín hǎo*, polite form) when speaking to elders or teachers. Because both characters carry 3rd tone, spoken Mandarin applies tone sandhi and pronounces 你 as 2nd tone (*ní hǎo*).`,
    },
    {
      id: "xiexie",
      name: "谢谢 (xiè xie)",
      markdown: `---
name: 谢谢 (xiè xie)
---

**Meaning:** Thank you
**Literal:** Thank (谢) + Thank (谢)

**Meta-Note / Connection:**
Always pair with 不客气 (*bú kèqi*, you're welcome). The second character loses its falling 4th tone and becomes a soft neutral tone.`,
    },
    {
      id: "ninhao",
      name: "您好 (nín hǎo)",
      markdown: `---
name: 您好 (nín hǎo)
---

**Meaning:** Hello (respectful / formal)
**Literal:** You-with-heart (您 = 你 over 心 heart) + Good (好)

**Meta-Note / Connection:**
Look at the radical 心 (heart) underneath 你 — literally placing "you" upon one's heart to show respect.`,
    },
    {
      id: "bukeqi",
      name: "不客气 (bú kèqi)",
      markdown: `---
name: 不客气 (bú kèqi)
---

**Meaning:** You're welcome
**Literal:** Not (不) + Guest-air / Standing on ceremony (客气)

**Meta-Note / Connection:**
Tone sandhi alert: 不 (*bù*) shifts to rising 2nd tone (*bú*) before a 4th-tone syllable (*kè*).`,
    },
    {
      id: "zaijian",
      name: "再见 (zài jiàn)",
      markdown: `---
name: 再见 (zài jiàn)
---

**Meaning:** Goodbye
**Literal:** Again (再) + See (见)

**Meta-Note / Connection:**
Same root pattern as French *au revoir* and German *auf Wiedersehen* ("until we see each other again").`,
    },
    {
      id: "qingwen",
      name: "请问 (qǐng wèn)",
      markdown: `---
name: 请问 (qǐng wèn)
---

**Meaning:** Excuse me / May I ask...
**Literal:** Invite / Please (请) + Ask (问)

**Meta-Note / Connection:**
Used strictly to preface a question. Do not use 请问 to apologize or squeeze past someone in a crowd (use 对不起 or 借过 instead).`,
    },
    {
      id: "wojiao",
      name: "我叫 (wǒ jiào)",
      markdown: `---
name: 我叫 (wǒ jiào)
---

**Meaning:** My name is / I am called
**Literal:** I (我) + Am called (叫)

**Meta-Note / Connection:**
Works directly before full names or given names without needing 是 (*shì*, to be).`,
    },
    {
      id: "duibuqi",
      name: "对不起 (duì bu qǐ)",
      markdown: `---
name: 对不起 (duì bu qǐ)
---

**Meaning:** I'm sorry / Excuse me
**Literal:** Face (对) + Cannot (不起)

**Meta-Note / Connection:**
Literally "unable to face you." Standard paired response is 没关系 (*méi guānxi*, it doesn't matter).`,
    },
    {
      id: "meiguanxi",
      name: "没关系 (méi guānxi)",
      markdown: `---
name: 没关系 (méi guānxi)
---

**Meaning:** No problem / It doesn't matter
**Literal:** No (没) + Connection / Consequence (关系)

**Meta-Note / Connection:**
Notice 关系 (*guānxi*, relationships/connections) is also a key cultural noun in Mandarin.`,
    },
  ],
  h5pGames: [
    {
      filename: "ch01-drag-match.h5p",
      title: "Chapter 1: Greetings & Politeness",
      defaultMode: "drag-words",
      pairs: [
        {
          id: "p1",
          term: "你好",
          reading: "nǐ hǎo",
          meaning: "Hello (standard)",
          hint: "Lit: You + Good",
        },
        {
          id: "p2",
          term: "您好",
          reading: "nín hǎo",
          meaning: "Hello (polite / elders)",
          hint: "Has the 心 (heart) radical underneath 你",
        },
        {
          id: "p3",
          term: "谢谢",
          reading: "xiè xie",
          meaning: "Thank you",
          hint: "Second syllable is neutral tone",
        },
        {
          id: "p4",
          term: "不客气",
          reading: "bú kèqi",
          meaning: "You're welcome",
          hint: "Lit: Don't stand on ceremony",
        },
        {
          id: "p5",
          term: "再见",
          reading: "zài jiàn",
          meaning: "Goodbye",
          hint: "Lit: Again + See",
        },
      ],
      dragSentences: [
        "When greeting a friend casually, say *你好*, or use *您好* for elders and teachers.",
        "To express gratitude, say *谢谢*, and the polite reply is *不客气*.",
        "When parting ways at the end of a conversation, say *再见*.",
      ],
    },
    {
      filename: "ch02-memory-match.h5p",
      title: "Chapter 2: Polite Requests & Introductions",
      defaultMode: "memory",
      pairs: [
        {
          id: "p6",
          term: "请问",
          reading: "qǐng wèn",
          meaning: "Excuse me (may I ask)",
          hint: "Lit: Please + Ask",
        },
        {
          id: "p7",
          term: "我叫",
          reading: "wǒ jiào",
          meaning: "My name is...",
          hint: "Lit: I + Am called",
        },
        {
          id: "p8",
          term: "对不起",
          reading: "duì bu qǐ",
          meaning: "I'm sorry",
          hint: "Paired with 没关系",
        },
        {
          id: "p9",
          term: "没关系",
          reading: "méi guānxi",
          meaning: "No problem / Never mind",
          hint: "Lit: No consequence",
        },
      ],
      dragSentences: [
        "Start a polite question to a stranger with *请问*, then introduce yourself using *我叫*.",
        "If you make a mistake, apologize with *对不起*, and reply *没关系* to reassure someone.",
      ],
    },
  ],
  vocab: [
    {
      id: "v-nihao",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      english: "hello",
      chapter: 1,
      meta_note: "Lit: you good. Polite form: 您好",
    },
    {
      id: "v-xiexie",
      hanzi: "谢谢",
      pinyin: "xiè xie",
      english: "thank you",
      chapter: 1,
      meta_note: "Pair with 不客气 (you're welcome)",
    },
    {
      id: "v-ninhao",
      hanzi: "您好",
      pinyin: "nín hǎo",
      english: "hello (polite)",
      chapter: 1,
      meta_note: "您 = 你 over 心 (heart); used for elders/teachers",
    },
    {
      id: "v-bukeqi",
      hanzi: "不客气",
      pinyin: "bú kèqi",
      english: "you're welcome",
      chapter: 1,
      meta_note: "Lit: don't act like a guest; 不 shifts to 2nd tone",
    },
    {
      id: "v-zaijian",
      hanzi: "再见",
      pinyin: "zài jiàn",
      english: "goodbye",
      chapter: 1,
      meta_note: "Lit: again + see (like au revoir)",
    },
    {
      id: "v-qingwen",
      hanzi: "请问",
      pinyin: "qǐng wèn",
      english: "excuse me / may I ask",
      chapter: 2,
      meta_note: "Lit: invite + ask; strictly before questions",
    },
    {
      id: "v-wojiao",
      hanzi: "我叫",
      pinyin: "wǒ jiào",
      english: "my name is",
      chapter: 2,
      meta_note: "Lit: I am called; followed directly by name",
    },
    {
      id: "v-duibuqi",
      hanzi: "对不起",
      pinyin: "duì bu qǐ",
      english: "I'm sorry",
      chapter: 2,
      meta_note: "Pair with 没关系 (no problem)",
    },
    {
      id: "v-meiguanxi",
      hanzi: "没关系",
      pinyin: "méi guānxi",
      english: "no problem / doesn't matter",
      chapter: 2,
      meta_note: "Lit: no connection/consequence",
    },
  ],
  fsrsStates: {},
  sandboxResponses: {},
};

export const SAMPLE_MESSY_SNIPPETS = [
  {
    label: "Mandarin: Ordering Coffee & Tea",
    subject: "Mandarin Chinese",
    chapterTitle: "Ordering Drinks",
    rawText: `LESSON 3 -- CAFE VOCAB (scan p.42)
Wǒ yào yī bēi kāfēi. 我要一杯咖啡 (I want a cup of coffee).
Key words: 咖啡 kafei = coffee, 茶 cha = tea, 水 shui = water, 多少钱 duoshao qian = how much money?
Dialogue: Waiter: 你好，你要喝什么？(What do you want to drink?) Customer: 我要一杯热茶，谢谢。请问，多少钱？(I want a cup of hot tea, thanks. Excuse me, how much?) Waiter: 十五块。(15 kuai.)
Note: 杯 (bei) is the measure word for cups/glasses. 块 (kuai) is spoken RMB yuan.`,
  },
  {
    label: "Japanese: Telling Time & Daily Routine",
    subject: "Japanese",
    chapterTitle: "Time & Daily Routine",
    rawText: `Ch 3 notes - Time expressions
Ima nan-ji desu ka? 今何時ですか (What time is it now?)
Vocab: 今 (ima) now, 何時 (nanji) what time, 午前 (gozen) AM, 午後 (gogo) PM, 毎日 (mainichi) every day.
Dialogue: A: すみません、今何時ですか。(Excuse me, what time is it now?) B: 午前九時です。(It is 9:00 AM.)
Grammar tip: Put 午前/午後 BEFORE the hour, unlike English AM/PM.`,
  },
  {
    label: "Biology: Cellular Respiration Basics",
    subject: "Cell Biology",
    chapterTitle: "Cellular Respiration",
    rawText: `UNIT 3 BIO NOTES (messy lecture dump)
ATP (Adenosine Triphosphate) = energy currency of the cell.
Glycolysis happens in the cytoplasm, breaks glucose (6C) into 2 pyruvate (3C), net gain 2 ATP + 2 NADH.
Krebs Cycle (Citric Acid Cycle) occurs in mitochondrial matrix, releases CO2.
Oxidative Phosphorylation happens along the inner mitochondrial membrane via electron transport chain -> ~28-32 ATP.
Remember: Aerobic needs O2 as final electron acceptor; without O2 cells switch to fermentation.`,
  },
];
