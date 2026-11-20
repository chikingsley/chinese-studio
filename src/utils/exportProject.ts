import JSZip from "jszip";
import { H5PGameFile, TextbookProject, VocabRow } from "../types/hyperbook";
import { serializeVocabCsv } from "./markdownParser";
import { BUILD_ANKI_PY } from "../data/starterProject";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildH5PContentJson(game: H5PGameFile) {
  const textField =
    game.dragSentences.length > 0
      ? game.dragSentences.join("\n\n")
      : game.pairs.map((p) => `${p.meaning}: *${p.term}* (${p.reading})`).join("\n");

  return {
    taskDescription: `Drag the words into the correct boxes — ${game.title}`,
    textField,
    overallFeedback: [
      { from: 0, to: 50, feedback: "Review the glossary terms and try again." },
      { from: 51, to: 99, feedback: "Good progress! Check the highlighted items." },
      { from: 100, to: 100, feedback: "Perfect score!" },
    ],
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      instantFeedback: false,
    },
    pairs: game.pairs,
    defaultMode: game.defaultMode,
  };
}

export function buildH5PManifestJson(game: H5PGameFile) {
  return {
    title: game.title,
    language: "en",
    mainLibrary: "H5P.DragText",
    embedTypes: ["iframe"],
    license: "CC BY-SA",
    preloadedDependencies: [
      { machineName: "H5P.DragText", majorVersion: 1, minorVersion: 10 },
    ],
  };
}

export async function createH5PZipBlob(game: H5PGameFile): Promise<Blob> {
  const zip = new JSZip();
  zip.file("h5p.json", JSON.stringify(buildH5PManifestJson(game), null, 2));
  zip.file(
    "content/content.json",
    JSON.stringify(buildH5PContentJson(game), null, 2)
  );
  return zip.generateAsync({ type: "blob" });
}

export async function downloadH5PFile(game: H5PGameFile): Promise<void> {
  const blob = await createH5PZipBlob(game);
  triggerDownload(blob, game.filename.endsWith(".h5p") ? game.filename : `${game.filename}.h5p`);
}

export function downloadVocabCsv(rows: VocabRow[]): void {
  const csv = serializeVocabCsv(rows);
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "vocab.csv");
}

export function downloadAnkiTsv(rows: VocabRow[]): void {
  const lines = rows.map((r) => {
    const front = `${r.hanzi}<br><span style="color:#64748b;font-size:0.85em">${r.pinyin}</span>`;
    const back = `${r.english}<br><br><em>${r.meta_note}</em>`;
    const tag = `ch${String(r.chapter).padStart(2, "0")}`;
    return [front, back, tag].map((s) => s.replace(/\t/g, " ").replace(/\n/g, " ")).join("\t");
  });
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8;" }),
    "anki-fsrs-deck.tsv"
  );
}

export function downloadBuildAnkiPy(): void {
  triggerDownload(
    new Blob([BUILD_ANKI_PY], { type: "text/x-python;charset=utf-8;" }),
    "build_anki.py"
  );
}

export async function downloadFullHyperbookZip(project: TextbookProject): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder("my-textbook");
  if (!root) return;

  root.file("hyperbook.json", JSON.stringify(project.config, null, 2));
  root.file("book/index.md", project.homeMarkdown);

  for (const ch of project.chapters) {
    root.file(`book/${ch.slug}/index.md`, ch.markdown);
  }

  for (const entry of project.glossary) {
    root.file(`glossary/${entry.id}.md`, entry.markdown);
  }

  for (const game of project.h5pGames) {
    const h5pBlob = await createH5PZipBlob(game);
    root.file(`public/${game.filename}`, h5pBlob);
  }

  root.file("data/vocab.csv", serializeVocabCsv(project.vocab));
  root.file("data/build_anki.py", BUILD_ANKI_PY);

  const readme = `# ${project.config.name}

${project.config.description}

## Run Locally with Hyperbook

\`\`\`bash
npm install
npx hyperbook dev      # Live preview at http://localhost:8080
npx hyperbook build    # Exports pure static HTML to .hyperbook/out
\`\`\`

## Generate Anki / FSRS Deck

\`\`\`bash
pip install genanki
python data/build_anki.py
\`\`\`
`;
  root.file("README.md", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, "my-textbook-hyperbook.zip");
}
