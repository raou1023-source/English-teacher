import { type AnkiCard, cardBackHtml, cleanField, csvField, toReadableText } from "@/lib/anki";

export function toAnkiDroidCsv(cards: AnkiCard[], deck = "英会話アプリ"): string {
  const header = [
    "#separator:comma",
    "#html:true",
    `#deck:${deck}`,
    "#notetype:Basic",
    "#columns:Front,Back",
  ].join("\n");
  const rows = cards.map((c) => `${csvField(cleanField(c.front))},${csvField(cardBackHtml(c))}`);
  return `\uFEFF${header}\n${rows.join("\n")}\n`;
}

export function toSheetCsv(cards: AnkiCard[]): string {
  const head = [
    "Front",
    "Meaning",
    "Core Concept",
    "Example1",
    "Example2",
    "Example3",
    "Example4",
    "Example5",
  ]
    .map(csvField)
    .join(",");
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
      .map((v) => csvField(cleanField(v)))
      .join(","),
  );
  return `\uFEFF${head}\n${rows.join("\n")}\n`;
}

function xmlEsc(s: string) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

export function toExcelXml(cards: AnkiCard[]): string {
  const cols = [
    "Front",
    "Meaning",
    "Core Concept",
    "Example1",
    "Example2",
    "Example3",
    "Example4",
    "Example5",
  ];
  const headerRow = cols
    .map((c) => `<Cell><Data ss:Type="String">${xmlEsc(c)}</Data></Cell>`)
    .join("");
  const body = cards
    .map((card) => {
      const vals = [
        card.front,
        card.meaning,
        card.core,
        card.examples[0] ?? "",
        card.examples[1] ?? "",
        card.examples[2] ?? "",
        card.examples[3] ?? "",
        card.examples[4] ?? "",
      ];
      return `<Row>${vals
        .map((v) => `<Cell><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`)
        .join("")}</Row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Eikaiwa">
  <Table>
   <Row>${headerRow}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareBlob(filename: string, blob: Blob) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: filename });
    return true;
  }
  downloadBlob(filename, file);
  return false;
}

export type ExportKind = "anki" | "excel" | "pdf" | "text";

export const EXPORT_KINDS: { id: ExportKind; label: string }[] = [
  { id: "anki", label: "AnkiDroid（CSV）" },
  { id: "excel", label: "Excel" },
  { id: "pdf", label: "PDF" },
  { id: "text", label: "テキスト" },
];

export function textForKind(kind: ExportKind, cards: AnkiCard[], fallback = "") {
  if (!cards.length) return fallback;
  if (kind === "excel") return toSheetCsv(cards);
  if (kind === "text") return toReadableText(cards);
  return toAnkiDroidCsv(cards);
}
