"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <button
      onClick={deferredPrompt ? handleInstall : undefined}
      className={
        "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm transition-all duration-200 " +
        (deferredPrompt
          ? "text-white/90 hover:bg-white/15 hover:text-white cursor-pointer"
          : "text-white/40 cursor-default")
      }
      title={
        deferredPrompt
          ? "Installer l'application"
          : "Ouvrez dans Chrome/Safari pour installer"
      }
    >
      <Download className="h-4 w-4 shrink-0" />
      <span>Installer l&apos;app</span>
    </button>
  );
}
