"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Displays a banner when a new service worker version is detected.
 * The user can click to update, or dismiss.
 */
export function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleUpdate = (reg: ServiceWorkerRegistration) => {
      // A new SW is waiting
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowBanner(true);
      }

      // Listen for new SW installing
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version installed but waiting
            setWaitingWorker(newWorker);
            setShowBanner(true);
          }
        });
      });
    };

    // Check existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        handleUpdate(reg);
        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60000);
      }
    });

    // Also listen for controller change (another tab triggered update)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("SKIP_WAITING");
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-[#6C5CE7] text-white rounded-2xl shadow-2xl px-5 py-3 max-w-md w-full">
        <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin-slow" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Nouvelle version disponible</div>
          <div className="text-xs text-white/80">Mettez a jour pour profiter des ameliorations</div>
        </div>
        <button
          onClick={handleUpdate}
          className="flex-shrink-0 bg-white text-[#6C5CE7] font-semibold text-xs rounded-xl px-3 py-1.5 hover:bg-gray-100 transition-colors"
        >
          Mettre a jour
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
