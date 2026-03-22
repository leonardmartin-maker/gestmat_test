import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { UpdateBanner } from "@/components/app/UpdateBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6C5CE7",
};

export const metadata: Metadata = {
  title: "GestMat — Gestion de materiel",
  description: "Gestion de flotte et materiel SaaS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GestMat",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var APP_VERSION = 'v9';
                var storedVersion = localStorage.getItem('gestmat-version');

                if (storedVersion !== APP_VERSION && 'serviceWorker' in navigator) {
                  // Unregister old service workers and clear caches
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    return Promise.all(regs.map(function(r) { return r.unregister(); }));
                  }).then(function() {
                    return caches.keys().then(function(keys) {
                      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                    });
                  }).then(function() {
                    localStorage.setItem('gestmat-version', APP_VERSION);
                    navigator.serviceWorker.register('/sw.js');
                    if (storedVersion) {
                      window.location.reload();
                    }
                  }).catch(function() {
                    localStorage.setItem('gestmat-version', APP_VERSION);
                  });
                } else if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js');
                }

                if (!storedVersion) {
                  localStorage.setItem('gestmat-version', APP_VERSION);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <UpdateBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
