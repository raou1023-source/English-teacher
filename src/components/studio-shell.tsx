import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { AuthSlot } from "@/components/auth-slot";
import { FolioMark } from "@/components/folio-mark";
import { FormatStudio } from "@/components/format-studio";
import { HistorySync } from "@/components/history-sync";
import { LevelBar } from "@/components/level-bar";
import { NativeSelect } from "@/components/native-select";
import { PwaInstall } from "@/components/pwa-install";
import { ScanStudio } from "@/components/scan-studio";
import { SpeakStudio } from "@/components/speak-studio";
import { Label } from "@/components/ui/label";
import { getAiStatus } from "@/lib/ai";
import { imageFilesFromClipboard } from "@/lib/clipboard";
import { VOICES } from "@/lib/formats";
import { compressImage } from "@/lib/media";
import { type Mode, rehydrateFolio, useFolio } from "@/lib/store";

const MODE_OPTIONS: { id: Mode; label: string }[] = [
  { id: "speak", label: "会話する" },
  { id: "scan", label: "画像を読む" },
  { id: "format", label: "テキストを整形" },
];

export function StudioShell() {
  const {
    mode,
    setMode,
    level,
    setLevel,
    voiceId,
    setVoiceId,
    autoPlay,
    setAutoPlay,
    ttsSpeed,
    setTtsSpeed,
    setPendingImage,
  } = useFolio();
  const [aiOff, setAiOff] = useState(false);

  useEffect(() => {
    rehydrateFolio();
  }, []);

  useEffect(() => {
    let alive = true;
    void getAiStatus().then((s) => {
      if (alive) setAiOff(!s.available);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    async function takeFile(file: File) {
      try {
        const dataUrl = await compressImage(file);
        setPendingImage(dataUrl);
        setMode("scan");
        toast.success("画像を受け取りました");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "画像の読み込みに失敗しました");
      }
    }

    const onPaste = (e: ClipboardEvent) => {
      const file = imageFilesFromClipboard(e.clipboardData)[0];
      if (!file) return;
      e.preventDefault();
      void takeFile(file);
    };

    const onDragOver = (e: DragEvent) => {
      if ([...(e.dataTransfer?.types ?? [])].includes("Files")) e.preventDefault();
    };

    const onDrop = (e: DragEvent) => {
      const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      void takeFile(file);
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [setMode, setPendingImage]);

  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <Toaster
        position="bottom-center"
        offset={96}
        toastOptions={{
          className: "!bg-paper !text-foreground !border-border !font-sans",
        }}
      />
      <header className="sticky top-0 z-20 bg-paper paper-grain pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <FolioMark className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-none tracking-tight sm:text-xl">英会話アプリ</p>
            <p className="mt-1 hidden text-[11px] tracking-wide text-muted-foreground sm:block">
              紙の上で、英語を書く。
            </p>
          </div>
          <AuthSlot />
          <div className="w-[9.75rem] shrink-0 sm:w-[13.5rem]">
            <LevelBar value={level} onChange={setLevel} compact name="folio-level-header" />
          </div>
        </div>
        <div className="letterhead-rules h-[5px] w-full" />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
        {aiOff ? (
          <p className="mb-4 rounded-md bg-memo px-4 py-3 text-sm paper-shadow">
            AI機能はこの環境では利用できません。
          </p>
        ) : null}

        <PwaInstall />

        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <NativeSelect
            id="folio-mode"
            label="いまやることを選ぶ"
            size="lg"
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS}
          />
          <details className="paper-sheet px-3 py-2 sm:min-w-52">
            <summary className="flex h-8 cursor-pointer list-none items-center text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
              設定
            </summary>
            <div className="mt-3 grid gap-4 pb-1">
              <div className="sm:hidden">
                <LevelBar value={level} onChange={setLevel} name="folio-level-settings" />
              </div>
              <NativeSelect
                id="folio-voice"
                label="声"
                value={voiceId}
                onChange={setVoiceId}
                options={[
                  { id: "device", label: "端末の声 · 使うほど精度が上がる" },
                  ...VOICES.map((v) => ({ id: v.id, label: `Grok · ${v.label} · ${v.blurb}` })),
                ]}
              />
              <div>
                <Label className="mb-2 block" htmlFor="speed">
                  読み上げ速度 {ttsSpeed.toFixed(2)}
                </Label>
                <input
                  id="speed"
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <label className="flex h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="size-4 accent-primary"
                />
                返答を自動再生
              </label>
            </div>
          </details>
        </div>

        <HistorySync />

        {mode === "speak" ? <SpeakStudio /> : null}
        {mode === "scan" ? <ScanStudio /> : null}
        {mode === "format" ? <FormatStudio /> : null}
      </div>
    </div>
  );
}
