import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/native-select";
import type { AnkiCard } from "@/lib/anki";
import {
  downloadBlob,
  EXPORT_KINDS,
  type ExportKind,
  shareBlob,
  textForKind,
  toAnkiDroidCsv,
  toExcelXml,
} from "@/lib/export-files";
import { cardsToPdfBlob } from "@/lib/pdf";

export function ExportBar({
  cards,
  fallbackText,
}: {
  cards: AnkiCard[];
  fallbackText?: string;
}) {
  const [kind, setKind] = useState<ExportKind>("anki");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () => textForKind(kind === "pdf" ? "anki" : kind, cards, fallbackText ?? ""),
    [kind, cards, fallbackText],
  );

  if (!cards.length && !(fallbackText ?? "").trim()) return null;

  async function fileForKind(): Promise<{ name: string; blob: Blob; copiedText?: string }> {
    if (kind === "excel") {
      const xml = cards.length ? toExcelXml(cards) : preview;
      return {
        name: "英会話アプリ.xls",
        blob: new Blob([xml], { type: "application/vnd.ms-excel" }),
        copiedText: preview,
      };
    }
    if (kind === "pdf") {
      if (!cards.length) throw new Error("カードがありません");
      const blob = await cardsToPdfBlob(cards);
      return { name: "英会話アプリ.pdf", blob, copiedText: preview };
    }
    if (kind === "text") {
      const text = preview;
      return {
        name: "英会話アプリ.txt",
        blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
        copiedText: text,
      };
    }
    const csv = cards.length ? toAnkiDroidCsv(cards) : preview;
    return {
      name: "英会話アプリ-ankidroid.csv",
      blob: new Blob([csv], { type: "text/csv;charset=utf-8" }),
      copiedText: csv,
    };
  }

  async function save() {
    setBusy(true);
    try {
      const file = await fileForKind();
      downloadBlob(file.name, file.blob);
      toast.success(`${file.name} を保存しました`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "書き出せませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const file = await fileForKind();
      const shared = await shareBlob(file.name, file.blob);
      toast.success(shared ? "共有シートを開きました" : `${file.name} を保存しました`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "共有できませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const text = preview;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("コピーしました");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("下の欄を長押ししてコピーしてください");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <NativeSelect
        id="folio-export-kind"
        label="書き出し"
        value={kind}
        onChange={setKind}
        options={EXPORT_KINDS}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex h-11 cursor-pointer touch-manipulation items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground select-none disabled:opacity-45"
        >
          {busy ? "準備中…" : "ダウンロード"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void share()}
          className="inline-flex h-11 cursor-pointer touch-manipulation items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground disabled:opacity-45"
        >
          共有
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-11 cursor-pointer touch-manipulation items-center rounded-md bg-paper px-4 text-sm font-medium paper-shadow"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          {kind === "anki"
            ? "AnkiDroidは CSV を「読み込む」。長押しでもコピーできます"
            : kind === "pdf"
              ? "PDFはダウンロード／共有してください"
              : "長押しでコピー"}
        </span>
        <textarea
          readOnly
          value={kind === "pdf" ? "PDF はダウンロードボタンから保存します。" : preview}
          rows={3}
          className="max-h-28 min-h-16 w-full resize-y rounded-md bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-foreground)_10%,transparent)]"
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
    </div>
  );
}
