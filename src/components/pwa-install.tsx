import { useEffect, useState } from "react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SKIP_KEY = "folio-pwa-skip";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function inFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function readStoredPrompt(): PromptEvent | null {
  return (window as Window & { __pwaPrompt?: PromptEvent | null }).__pwaPrompt ?? null;
}

export function PwaInstall() {
  const [standalone, setStandalone] = useState(false);
  const [framed, setFramed] = useState(false);
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) {
      setStandalone(true);
      return;
    }
    try {
      if (sessionStorage.getItem(SKIP_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setHidden(false);
    setFramed(inFrame());
    setPromptEvent(readStoredPrompt());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const ev = e as PromptEvent;
      (window as Window & { __pwaPrompt?: PromptEvent | null }).__pwaPrompt = ev;
      setPromptEvent(ev);
    };
    const onReady = () => setPromptEvent(readStoredPrompt());
    const onInstalled = () => {
      (window as Window & { __pwaPrompt?: PromptEvent | null }).__pwaPrompt = null;
      setPromptEvent(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || hidden) return null;

  function skip() {
    try {
      sessionStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  async function install() {
    const ev = promptEvent ?? readStoredPrompt();
    if (ev) {
      setBusy(true);
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice.outcome === "accepted") setHidden(true);
        else setHint(true);
      } catch {
        setHint(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (framed) {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      setHint(true);
      return;
    }
    setHint(true);
  }

  const android = typeof navigator !== "undefined" && isAndroid();
  const ios = typeof navigator !== "undefined" && isIos();
  const canPrompt = Boolean(promptEvent);

  return (
    <div className="paper-sheet mb-5 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          {framed
            ? "この画面の中では追加できません。下のボタンで Chrome のタブとして開いてください。"
            : "ホーム画面に追加すると、次からアプリとして開けます。"}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void install()}
          className="inline-flex h-11 shrink-0 cursor-pointer touch-manipulation items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-45"
        >
          {busy ? "準備中…" : framed ? "Chromeで開く" : canPrompt ? "インストール" : "ホームに追加"}
        </button>
        {framed ? null : (
          <button
            type="button"
            onClick={skip}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-md px-3 text-sm text-muted-foreground"
          >
            あとで
          </button>
        )}
      </div>
      {hint ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {ios
            ? "共有ボタン →「ホーム画面に追加」を押してください。"
            : android
              ? "右上「⋮」→「ホーム画面に追加」。次の画面で「インストール」または「追加」を押します。"
              : "メニューの「アプリをインストール」または「ホーム画面に追加」を選んでください。"}
        </p>
      ) : null}
    </div>
  );
}
