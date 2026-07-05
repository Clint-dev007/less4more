import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "l4_install_banner_dismissed_v1";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
    ? true
    : /iPad|iPhone|iPod/.test(ua);
}

function useInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
    return outcome === "accepted";
  };

  return { canInstall: !!deferred, installed, promptInstall };
}

function IosSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 grid place-items-end sm:place-items-center" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Install less4more</div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">On iPhone, install this app from Safari:</p>
        <ol className="text-sm space-y-2">
          <li className="flex items-center gap-2">1. Tap <Share className="h-4 w-4 text-primary" /> Share</li>
          <li className="flex items-center gap-2">2. Tap <Plus className="h-4 w-4 text-primary" /> Add to Home Screen</li>
          <li>3. Tap <span className="font-semibold">Add</span></li>
        </ol>
      </div>
    </div>
  );
}

export function InstallBanner() {
  const { canInstall, installed, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (installed || dismissed) return null;
  const ios = isIos();
  if (!canInstall && !ios) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const onInstall = async () => {
    if (ios) { setShowIos(true); return; }
    const ok = await promptInstall();
    if (ok) dismiss();
  };

  return (
    <>
      <div className="mx-1 mb-3 rounded-2xl gradient-primary text-primary-foreground p-3 flex items-center gap-3 glow-primary">
        <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">Install the less4more app</div>
          <div className="text-[11px] opacity-90">Add to your home screen for quick access.</div>
        </div>
        <button onClick={onInstall} className="text-xs font-bold bg-white/25 hover:bg-white/35 px-3 py-1.5 rounded-full">
          Install
        </button>
        <button onClick={dismiss} className="p-1.5 rounded-full bg-white/15" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {showIos && <IosSheet onClose={() => setShowIos(false)} />}
    </>
  );
}

export function InstallAppCard() {
  const { canInstall, installed, promptInstall } = useInstall();
  const [showIos, setShowIos] = useState(false);
  const ios = isIos();

  const onInstall = async () => {
    if (installed) return;
    if (ios) { setShowIos(true); return; }
    if (canInstall) await promptInstall();
    else setShowIos(true);
  };

  return (
    <>
      <button
        onClick={onInstall}
        className="w-full card-3d rounded-3xl p-4 flex items-center gap-3 text-left"
      >
        <div className="h-11 w-11 rounded-2xl gradient-primary grid place-items-center glow-primary shrink-0">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {installed ? "App installed" : "Download the app"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {installed
              ? "You're using the installed app."
              : "Add less4more to your home screen for a native-app feel."}
          </div>
        </div>
        {!installed && (
          <span className="text-xs font-bold text-primary">Install</span>
        )}
      </button>
      {showIos && <IosSheet onClose={() => setShowIos(false)} />}
    </>
  );
}