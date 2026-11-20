import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface ConvertRequestBody {
  rawText?: string;
  chapterIndex?: number;
  chapterTitle?: string;
  subjectHint?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/convert-textbook", async (req, res) => {
    try {
      const { rawText, chapterIndex = 3, chapterTitle = "", subjectHint = "" } =
        (req.body || {}) as ConvertRequestBody;

      if (!rawText || typeof rawText !== "string" || rawText.trim().length < 10) {
        res.status(400).json({
          error: "Please paste at least a short textbook snippet (10+ characters) to convert.",
        });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            "GEMINI_API_KEY is not configured on the server. Add your key in Settings > Secrets.",
        });
        return;
      }

      const paddedChapter = String(Math.max(1, Math.floor(Number(chapterIndex) || 3))).padStart(
        2,
        "0"
      );
      const h5pFilename = `ch${paddedChapter}-drag-match.h5p`;

      const systemInstruction = `You are an expert curriculum designer who transforms messy, raw textbook excerpts into clean, structured Hyperbook Markdown textbooks with reusable glossary cards, interactive H5P Wordwall-style games, and FSRS/Anki flashcard rows.

Follow these exact Hyperbook Markdown syntax rules strictly:
1. Frontmatter at top of chapter markdown:
---
name: "Chapter ${Number(chapterIndex) || 3}: <Clear Title>"
index: ${Number(chapterIndex) || 3}
---
2. Inline glossary links: Use :t[Term Display]{#termid} where termid is lowercase ASCII slug (letters/numbers/hyphens, e.g., #nihao or #mitochondria) matching the glossary entry id.
3. Dialogue audio directive: Include ::audio{src="./dialogue.mp3"} in section 2 if there is a dialogue or example sentences, and populate audioLines with the spoken lines.
4. Collapsible notes block:
:::collapsible{title="Show Translation & Notes"}
- Bullet points with explanations or translations
:::
5. Fill-in-the-blank block:
:::multievent
Clear prompt sentence with 2 to 4 blanks written as {t{exact_answer}}.
:::
6. H5P game embed:
::h5p{src="/${h5pFilename}"}
7. Free-response sandbox:
::textinput{placeholder="Practice writing or translating two sentences here..."}

For each glossary entry, format its markdown with frontmatter:
---
name: <Term Display (reading/pronunciation if applicable)>
---

**Meaning:** <concise definition>
**Literal:** <literal breakdown, etymology, or formula>

**Meta-Note / Connection:**
<helpful mnemonic, contrast, or cross-concept connection>

Make sure every #id referenced with :t[...]{#id} in the chapter markdown exists in glossaryTerms.
For non-Chinese subjects (e.g., Biology, Spanish, Japanese, Physics), put the core term in "hanzi", pronunciation/symbol/formula (or short cue) in "pinyin", and concise meaning in "english" so the single vocab.csv schema stays consistent across subjects.`;

      const userPrompt = `Convert this raw textbook excerpt into Chapter ${Number(chapterIndex) || 3}${
        chapterTitle ? ` (preferred title: "${chapterTitle}")` : ""
      }${subjectHint ? ` (subject/language: ${subjectHint})` : ""}.

Raw Textbook Excerpt:
"""
${rawText.trim().slice(0, 8000)}
"""`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapter: {
                type: Type.OBJECT,
                properties: {
                  slug: {
                    type: Type.STRING,
                    description: `Folder slug such as chapter-${paddedChapter}`,
                  },
                  index: { type: Type.INTEGER },
                  name: { type: Type.STRING },
                  markdown: {
                    type: Type.STRING,
                    description: "Full Hyperbook Markdown document including frontmatter.",
                  },
                  audioLines: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING },
                        reading: { type: Type.STRING },
                        translation: { type: Type.STRING },
                      },
                      required: ["speaker", "text", "reading", "translation"],
                    },
                  },
                },
                required: ["slug", "index", "name", "markdown", "audioLines"],
              },
              glossaryTerms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "Lowercase alphanumeric slug matching :t[...]{#id}",
                    },
                    name: { type: Type.STRING },
                    markdown: {
                      type: Type.STRING,
                      description: "Full glossary markdown file with frontmatter and notes.",
                    },
                  },
                  required: ["id", "name", "markdown"],
                },
              },
              h5pGame: {
                type: Type.OBJECT,
                properties: {
                  filename: {
                    type: Type.STRING,
                    description: `Exact filename: ${h5pFilename}`,
                  },
                  title: { type: Type.STRING },
                  defaultMode: {
                    type: Type.STRING,
                    description: "One of: drag-words, match-up, memory, dialog-cards",
                  },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        term: { type: Type.STRING },
                        reading: { type: Type.STRING },
                        meaning: { type: Type.STRING },
                        hint: { type: Type.STRING },
                      },
                      required: ["term", "reading", "meaning", "hint"],
                    },
                  },
                  dragSentences: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                      description:
                        "Sentence with draggable target words wrapped in asterisks, e.g. 'To greet someone politely, say *您好* (*nín hǎo*).'",
                    },
                  },
                },
                required: ["filename", "title", "defaultMode", "pairs", "dragSentences"],
              },
              vocabRows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hanzi: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    english: { type: Type.STRING },
                    chapter: { type: Type.INTEGER },
                    meta_note: { type: Type.STRING },
                  },
                  required: ["hanzi", "pinyin", "english", "chapter", "meta_note"],
                },
              },
            },
            required: ["chapter", "glossaryTerms", "h5pGame", "vocabRows"],
          },
        },
      });

      const rawOutput = (response.text ?? "").trim();
      if (!rawOutput) {
        res.status(502).json({
          error: "The model returned an empty response. Please try again with a clearer excerpt.",
        });
        return;
      }

      const parsed = JSON.parse(rawOutput);
      res.json(parsed);
    } catch (err: unknown) {
      console.error("Error converting textbook:", err);
      const message =
        err instanceof Error ? err.message : "Failed to convert textbook snippet.";
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hyperbook Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
