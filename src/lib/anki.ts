export type AnkiCard = {
  front: string;
  meaning: string;
  core: string;
  examples: string[];
};

function asString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function parseCards(raw: unknown): AnkiCard[] {
  if (!Array.isArray(raw)) return [];
  const cards: AnkiCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const front = asString(o.front) || asString(o.word) || asString(o.phrase);
    if (!front) continue;
    const examples = (
      Array.isArray(o.examples) ? o.examples : Array.isArray(o.example) ? o.example : []
    )
      .map((e) => String(e ?? "").trim())
      .filter(Boolean)
      .slice(0, 5);
    while (examples.length < 5) examples.push("");
    cards.push({
      front,
      meaning: asString(o.meaning),
      core: asString(o.core) || asString(o.core_concept) || asString(o.coreConcept),
      examples,
    });
  }
  return cards.slice(0, 12);
}

function esc(s: string) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function mdBoldToHtml(s: string) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

export function cleanField(s: string) {
  return s.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
}

export function csvField(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

export function cardBackHtml(card: AnkiCard): string {
  const examples = card.examples.filter(Boolean);
  const items = examples.map((e) => `<li>${mdBoldToHtml(e)}</li>`).join("");
  return [
    `<div><b>意味</b><br>${esc(card.meaning)}</div>`,
    `<div style="margin-top:0.6em"><b>Core Concept</b><br>${esc(card.core)}</div>`,
    `<div style="margin-top:0.6em"><b>例文</b><ol>${items}</ol></div>`,
  ].join("");
}

export function toAnkiDroidTsv(cards: AnkiCard[], deck = "英会話アプリ"): string {
  const header = [
    "#separator:tab",
    "#html:true",
    `#deck:${deck}`,
    "#notetype:Basic",
    "#columns:Front,Back",
  ].join("\n");
  const rows = cards.map((c) => `${cleanField(c.front)}\t${cardBackHtml(c)}`);
  return `\uFEFF${header}\n${rows.join("\n")}\n`;
}

export function toFieldTsv(cards: AnkiCard[]): string {
  const header = [
    "#separator:tab",
    "#html:true",
    "#deck:英会話アプリ",
    "#columns:Front,Meaning,Core,Example1,Example2,Example3,Example4,Example5",
  ].join("\n");
  const rows = cards.map((c) =>
    [
      c.front,
      c.meaning,
      c.core,
      c.examples[0] ?? "",
      c.examples[1] ?? "",
      c.examples[2] ?? "",
      c.examples[3] ?? "",
      c.examples[4] ?? "",
    ]
      .map(cleanField)
      .join("\t"),
  );
  return `\uFEFF${header}\n${rows.join("\n")}\n`;
}

export function toReadableText(cards: AnkiCard[]): string {
  return cards
    .map((c, i) => {
      const examples = c.examples.filter(Boolean);
      return [
        `${i + 1}. ${c.front}`,
        `意味: ${c.meaning}`,
        `Core Concept: ${c.core}`,
        ...examples.map((e, n) => `例文${n + 1}: ${e}`),
      ].join("\n");
    })
    .join("\n\n");
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/plain" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: filename });
    return true;
  }
  downloadTextFile(filename, text);
  return false;
}

export const ANKI_CARD_INSTRUCTION = `Always also extract AnkiDroid cards from the material (8–10 cards max).
Each card MUST have:
- front: one English WORD or PHRASE (short, as it should appear on an Anki card)
- meaning: Japanese meaning (concise)
- core: Core Concept — one simple English sentence of the idea to remember (not a translation)
- examples: EXACTLY 5 natural example sentences at the learner's CEFR. Put the target in **bold**. Mix everyday and slightly fuller sentences. No numbering inside the strings.

Return them in JSON field "cards": [{"front":"...","meaning":"...","core":"...","examples":["...","...","...","...","..."]}]`;
