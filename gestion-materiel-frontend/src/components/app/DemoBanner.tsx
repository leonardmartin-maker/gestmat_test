"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useState } from "react";

/**
 * Shows a floating banner when the user is in demo mode.
 * Demo users have emails matching "admin@demo-*.gestmat.ch".
 */
export function DemoBanner() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const isDemo = user?.email?.includes("@demo-") && user?.email?.endsWith(".gestmat.ch");

  if (!isDemo || dismissed) return null;

  const handleRegister = () => {
    logout();
    router.push("/register");
  };

  return (
    <div className="bg-gradient-to-r from-[#6C5CE7] via-[#a855f7] to-[#06b6d4] text-white px-4 py-2 text-center text-sm relative">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium">Mode demo</span>
        <span className="text-white/80 hidden sm:inline">— Explorez librement ! Donnees supprimees apres 24h.</span>
        <button
          onClick={handleRegister}
          className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ml-2"
        >
          Creer mon compte
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
