"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * PwaInstallButton — works for both Chrome (beforeinstallprompt) and Safari/iOS
 * On iOS, shows step-by-step instructions since Safari doesn't support the install prompt API.
 */
export function PwaInstallButton({ variant = "sidebar" }: { variant?: "sidebar" | "banner" }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    setIos(isIOS());

    // Check if user dismissed the iOS guide before
    const wasDismissed = localStorage.getItem("pwa-ios-dismissed");
    if (wasDismissed) setDismissed(true);

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

  const dismissIOSGuide = () => {
    setShowIOSGuide(false);
    setDismissed(true);
    localStorage.setItem("pwa-ios-dismissed", "1");
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // ---- Banner variant (for /e layout) ----
  if (variant === "banner") {
    if (dismissed && !showIOSGuide) return null;

    // Chrome/Android with prompt available
    if (deferredPrompt) {
      return (
        <div className="mx-auto max-w-lg px-4">
          <button
            onClick={handleInstall}
            className="w-full flex items-center gap-3 rounded-2xl bg-white shadow-sm border border-[#6C5CE7]/20 p-3 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6C5CE7]/10">
              <Download className="h-5 w-5 text-[#6C5CE7]" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-gray-900">Installer GestMat</div>
              <div className="text-xs text-gray-500">Accedez rapidement depuis votre ecran d'accueil</div>
            </div>
          </button>
        </div>
      );
    }

    // iOS instructions
    if (ios) {
      if (showIOSGuide) {
        return (
          <div className="mx-auto max-w-lg px-4">
            <div className="rounded-2xl bg-white shadow-sm border border-[#6C5CE7]/20 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="text-sm font-semibold text-gray-900">Installer GestMat sur iPhone/iPad</div>
                <button onClick={dismissIOSGuide} className="text-gray-400 hover:text-gray-600 -mt-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-bold flex-shrink-0">1</span>
                  <span>Appuyez sur le bouton <Share className="inline h-4 w-4 text-[#007AFF] -mt-0.5" /> <strong>Partager</strong> en bas de Safari</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-bold flex-shrink-0">2</span>
                  <span>Faites defiler et appuyez sur <strong>Sur l'ecran d'accueil</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-bold flex-shrink-0">3</span>
                  <span>Appuyez sur <strong>Ajouter</strong></span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="mx-auto max-w-lg px-4">
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-white shadow-sm border border-[#6C5CE7]/20 p-3 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#6C5CE7]/10">
              <Download className="h-5 w-5 text-[#6C5CE7]" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-gray-900">Installer GestMat</div>
              <div className="text-xs text-gray-500">Ajouter a l'ecran d'accueil</div>
            </div>
          </button>
        </div>
      );
    }

    return null;
  }

  // ---- Sidebar variant (dashboard) ----

  // Chrome/Android with prompt
  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-white/90 hover:bg-white/15 hover:text-white cursor-pointer transition-all duration-200"
        title="Installer l'application"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Installer l&apos;app</span>
      </button>
    );
  }

  // iOS in sidebar — show guide trigger
  if (ios) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(!showIOSGuide)}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white cursor-pointer transition-all duration-200"
          title="Instructions d'installation"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Installer l&apos;app</span>
        </button>
        {showIOSGuide && (
          <div className="mx-2 mb-2 rounded-lg bg-white/10 p-3 space-y-2">
            <div className="text-xs text-white/90 font-medium">Sur Safari :</div>
            <div className="text-xs text-white/70 space-y-1">
              <p>1. Appuyez sur <Share className="inline h-3 w-3" /> Partager</p>
              <p>2. Sur l'ecran d'accueil</p>
              <p>3. Ajouter</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // No prompt available, not iOS — hide
  return null;
}
