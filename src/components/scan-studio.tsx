import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { FileField } from "@/components/file-field";
import { FormatPicker } from "@/components/format-picker";
import { PaperSheet } from "@/components/paper-sheet";
import { StudyMarkdown } from "@/components/study-markdown";
import { AnkiCards } from "@/components/anki-cards";
import { ExportBar } from "@/components/export-bar";
import { imageFilesFromClipboard } from "@/lib/clipboard";
import { readImage } from "@/lib/ai";
import { compressImage } from "@/lib/media";
import { speakText, unlockSpeak } from "@/lib/speech";
import { useFolio } from "@/lib/store";

export function ScanStudio() {
  const {
    level,
    formatId,
    setFormatId,
    customFormat,
    setCustomFormat,
    lastScan,
    setLastScan,
    voiceId,
    ttsSpeed,
    ttsEngine,
    pendingImage,
    setPendingImage,
  } = useFolio();

  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteHint, setPasteHint] = useState("");

  const analyze = useCallback(
    async (dataUrl: string) => {
      setBusy(true);
      try {
        const res = await readImage({
          data: {
            imageDataUrl: dataUrl,
            level,
            formatId,
            customFormat,
          },
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setLastScan({
          extracted: res.extracted,
          translationJa: res.translationJa,
          formatted: res.formatted,
          notesJa: res.notesJa,
          formatId,
          cards: res.cards ?? [],
        });
      } catch {
        toast.error("画像を読めませんでした");
      } finally {
        setBusy(false);
      }
    },
    [customFormat, formatId, level, setLastScan],
  );

  const ingest = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("画像ファイルを選んでください");
        return;
      }
      try {
        const dataUrl = await compressImage(file);
        setPreview(dataUrl);
        await analyze(dataUrl);
      } catch {
        toast.error("画像の読み込みに失敗しました");
      }
    },
    [analyze],
  );

  useEffect(() => {
    if (!pendingImage) return;
    setPreview(pendingImage);
    const dataUrl = pendingImage;
    setPendingImage(null);
    void analyze(dataUrl);
  }, [pendingImage, analyze, setPendingImage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <FormatPicker
        value={formatId}
        custom={customFormat}
        onChange={setFormatId}
        onCustom={setCustomFormat}
      />

      <PaperSheet className="p-4 sm:p-5">
        {preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <img
              src={preview}
              alt="読み取った画像"
              className="max-h-48 w-full rounded-sm object-contain outline outline-1 -outline-offset-1 outline-foreground/15 sm:max-h-56 sm:w-48"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                教科書・看板・メモの写真を自動で読み、指定した形式に整えます。
              </p>
              <FileField
                id="scan-replace"
                label="別の画像"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busy}
                onFile={(file) => void ingest(file)}
              />
              {preview ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void analyze(preview);
                  }}
                >
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground disabled:opacity-45"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    同じ画像で再生成
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-4 py-2 sm:py-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">Scan</p>
            <h2 className="font-display text-3xl leading-tight">写真を置くと、英語になる。</h2>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              画像をコピーして下の欄に貼るか、ファイルを選んでください。選んだ瞬間に読み取ります。
            </p>
            <label className="flex flex-col gap-1" htmlFor="scan-paste">
              <span className="text-xs font-medium text-muted-foreground">
                画像をここに貼り付け
              </span>
              <input
                id="scan-paste"
                type="text"
                enterKeyHint="go"
                autoComplete="off"
                value={pasteHint}
                onChange={(e) => setPasteHint(e.target.value)}
                onPaste={(e) => {
                  const file = imageFilesFromClipboard(e.clipboardData)[0];
                  if (!file) return;
                  e.preventDefault();
                  setPasteHint("");
                  void ingest(file);
                }}
                placeholder="この欄をタップ → 長押しで貼り付け"
                className="field h-12 px-3.5 text-base"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <FileField
                id="scan-file"
                label="写真を選ぶ"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onFile={(file) => void ingest(file)}
              />
              <FileField
                id="scan-camera"
                label="カメラで撮る"
                accept="image/*"
                capture="environment"
                onFile={(file) => void ingest(file)}
              />
            </div>
          </div>
        )}
      </PaperSheet>

      {busy ? (
        <div className="space-y-3 paper-sheet p-5">
          <div className="h-4 w-40 rounded-sm folio-shimmer" />
          <div className="h-3 w-full rounded-sm folio-shimmer" />
          <div className="h-3 w-5/6 rounded-sm folio-shimmer" />
          <div className="h-3 w-2/3 rounded-sm folio-shimmer" />
        </div>
      ) : lastScan ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <section className="min-w-0 overflow-hidden paper-sheet p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground">読み取り</h3>
              <div className="flex">
                {lastScan.extracted ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      unlockSpeak();
                      try {
                        await speakText({
                          text: lastScan.extracted.slice(0, 800),
                          voiceId,
                          speed: ttsSpeed,
                          engine: ttsEngine,
                        });
                      } catch {
                        toast.error("音声を再生できませんでした");
                      }
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex h-11 cursor-pointer touch-manipulation items-center gap-1 rounded-md px-3 text-sm"
                    >
                      <Volume2 className="size-4" />
                      聞く
                    </button>
                  </form>
                ) : null}
                <CopyButton text={lastScan.extracted} />
              </div>
            </div>
            {lastScan.extracted ? (
              <p className="whitespace-pre-wrap font-display text-[1.02rem] leading-relaxed">
                {lastScan.extracted}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">英文の抽出はありませんでした。</p>
            )}
            {lastScan.translationJa ? (
              <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {lastScan.translationJa}
              </p>
            ) : null}
          </section>
          <section className="min-w-0 overflow-hidden paper-sheet p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground">指定フォーマット</h3>
              <CopyButton text={lastScan.formatted} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <ExportBar cards={lastScan.cards ?? []} fallbackText={lastScan.formatted} />
              {(lastScan.cards ?? []).length ? <AnkiCards cards={lastScan.cards} /> : null}
              {lastScan.formatted && (!(lastScan.cards ?? []).length || formatId !== "anki") ? (
                <StudyMarkdown text={lastScan.formatted} />
              ) : null}
            </div>
            {lastScan.notesJa ? (
              <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {lastScan.notesJa}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
