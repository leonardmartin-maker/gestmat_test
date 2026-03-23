"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tokenStorage } from "@/lib/auth/token";
import { getMe } from "@/lib/api/me";
import { startDemo } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Box,
  Truck,
  Shield,
  Users,
  QrCode,
  AlertTriangle,
  Fuel,
  Wrench,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Globe,
  Lock,
  Zap,
  Sparkles,
  ChevronRight,
  Play,
  Star,
  Menu,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [checking, setChecking] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const t = tokenStorage.get();
    if (!t) {
      setChecking(false);
      return;
    }
    getMe()
      .then((me) => {
        router.replace(me.role === "EMPLOYEE" ? "/e" : "/dashboard");
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleStartDemo = async () => {
    setDemoLoading(true);
    try {
      const { access_token } = await startDemo();
      await loginWithToken(access_token);
      router.push("/dashboard");
    } catch {
      setDemoLoading(false);
      alert("Erreur lors du lancement de la demo. Veuillez reessayer.");
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Floating Navbar */}
      <nav
        className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg shadow-gray-200/50"
            : "bg-white/60 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#a855f7]">
              <Box className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              GestMat
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors">
              Fonctionnalites
            </a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors">
              Tarifs
            </a>
            <a href="#security" className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors">
              Securite
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleStartDemo}
              disabled={demoLoading}
              className="text-sm text-gray-500 hover:text-gray-900 px-3 py-2 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {demoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Demo
            </button>
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] text-white rounded-xl px-5 py-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Essai gratuit
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden text-gray-500 hover:text-gray-900"
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 rounded-b-2xl p-4 space-y-2">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Fonctionnalites</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Tarifs</a>
            <a href="#security" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600 hover:text-gray-900 py-2">Securite</a>
            <button
              onClick={() => { setMobileMenu(false); handleStartDemo(); }}
              disabled={demoLoading}
              className="w-full text-center text-sm text-[#6C5CE7] border border-[#6C5CE7]/30 rounded-xl py-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {demoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Essayer la demo
            </button>
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link href="/login" className="flex-1 text-center text-sm text-gray-600 border border-gray-200 rounded-xl py-2">Connexion</Link>
              <Link href="/register" className="flex-1 text-center text-sm font-medium text-white bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] rounded-xl py-2">Essai gratuit</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 sm:pt-40 pb-20 px-4 bg-gradient-to-b from-[#F8F7FF] to-white">
        {/* Subtle background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#6C5CE7]/[0.06] rounded-full blur-[128px]" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#a855f7]/[0.05] rounded-full blur-[128px]" />
          <div className="absolute top-60 left-1/2 w-72 h-72 bg-[#06b6d4]/[0.04] rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge Produit suisse + Bientôt disponible */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-sm px-4 py-1.5 text-sm text-gray-600">
              <span className="text-lg leading-none">🇨🇭</span>
              <span className="font-medium text-gray-900">Produit suisse</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 px-4 py-1.5 text-sm text-[#6C5CE7] font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Bientot disponible
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            <span className="text-gray-900">
              Gerez votre flotte
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#6C5CE7] via-[#a855f7] to-[#06b6d4] bg-clip-text text-transparent">
              en toute simplicite
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Vehicules, EPI, outillage — suivez tout votre parc en temps reel.
            QR codes, incidents, maintenance et carburant dans une seule application.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] text-white font-semibold rounded-xl px-7 py-3.5 hover:shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-[1.02]"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={handleStartDemo}
              disabled={demoLoading}
              className="group inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-7 py-3.5 hover:border-[#6C5CE7]/30 hover:text-[#6C5CE7] shadow-sm hover:shadow-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  Essayer la demo
                </>
              )}
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            14 jours gratuits — sans carte bancaire
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">14j</div>
              <div className="text-xs text-gray-400 mt-1">Essai gratuit</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">2min</div>
              <div className="text-xs text-gray-400 mt-1">Installation</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">100%</div>
              <div className="text-xs text-gray-400 mt-1">Suisse 🇨🇭</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-20 px-4" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#6C5CE7] text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              FONCTIONNALITES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Une solution complete pour la gestion de votre parc materiel
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-3">
            <BentoCard
              icon={QrCode}
              title="QR Codes intelligents"
              desc="Scannez pour prendre ou rendre du materiel. Chaque asset a son QR unique. Fonctionne sur mobile, tablette, et meme hors ligne."
              color="#6C5CE7"
              className="md:row-span-2"
              large
            />
            <BentoCard
              icon={Truck}
              title="Gestion de flotte"
              desc="Suivi kilometrique, attributions, historique complet."
              color="#06b6d4"
            />
            <BentoCard
              icon={Shield}
              title="EPI & equipements"
              desc="Casques, gilets, outils — categories personnalisees."
              color="#10b981"
            />
            <BentoCard
              icon={AlertTriangle}
              title="Incidents & accidents"
              desc="Declaration photos, localisation, partie adverse."
              color="#ef4444"
            />
            <BentoCard
              icon={Fuel}
              title="Tickets carburant"
              desc="Photo du ticket, OCR automatique, validation manager."
              color="#f97316"
            />
            <BentoCard
              icon={BarChart3}
              title="Dashboard temps reel"
              desc="KPIs, alertes urgentes, derniers mouvements — tout en un coup d'oeil. Interface pensee pour les managers sur le terrain."
              color="#a855f7"
              className="md:row-span-2"
              large
            />
            <BentoCard
              icon={Wrench}
              title="Maintenance preventive"
              desc="Alertes par date ou kilometrage."
              color="#eab308"
            />
            <BentoCard
              icon={Building2}
              title="Multi-site & depots"
              desc="Gerez plusieurs sites, filtrez par depot, scopez les managers."
              color="#6C5CE7"
            />
            <BentoCard
              icon={Smartphone}
              title="PWA mobile"
              desc="Installez sur mobile comme une app native."
              color="#06b6d4"
            />
          </div>
        </div>
      </section>

      {/* Produit suisse banner */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-r from-[#F8F7FF] to-[#EEF2FF] border border-[#6C5CE7]/10 p-8 sm:p-10 text-center">
            <div className="text-4xl mb-4">🇨🇭</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Produit suisse</h3>
            <p className="text-gray-500 max-w-lg mx-auto">
              Concu et heberge en Suisse. Vos donnees restent sur le territoire suisse,
              conformes aux exigences les plus strictes en matiere de protection des donnees.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-[#F8F7FF]" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[#06b6d4] text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              TARIFS
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Simple et transparent
            </h2>
            <p className="mt-4 text-gray-500">
              Un seul prix par employe. Pas de surprise.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            <PricingCard
              name="Essai"
              price="Gratuit"
              period="14 jours"
              features={["3 employes", "3 vehicules", "3 equipements", "Toutes fonctionnalites"]}
              cta="Commencer"
              href="/register"
            />
            <PricingCard
              name="Standard"
              price="4.90"
              period="CHF / employe / mois"
              features={["Vehicules & EPI illimites", "QR codes & scan mobile", "Incidents & maintenance", "Tickets carburant (OCR)", "Dashboard temps reel", "Support email"]}
              cta="Choisir"
              href="/register"
              highlight
            />
            <PricingCard
              name="Multi-site"
              price="5.90"
              period="CHF / employe / mois"
              features={["Tout le plan Standard", "Multi-site / multi-depot", "Filtrage par site", "Manager scope par depot", "Support prioritaire"]}
              cta="Choisir"
              href="/register"
            />
            <PricingCard
              name="Entreprise"
              price="Sur devis"
              period="50+ employes"
              features={["Tout le plan Multi-site", "Support dedie & SLA", "Personnalisation", "Formation sur site", "Facturation annuelle"]}
              cta="Nous contacter"
              href="mailto:contact@swissworktogether.ch"
            />
          </div>

          {/* Exemple de calcul */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-400">
              Exemple : 10 employes Standard = <span className="font-semibold text-gray-600">49 CHF / mois</span>
            </p>
          </div>
        </div>
      </section>

      {/* Security / Trust */}
      <section className="py-20 px-4 bg-[#F8F7FF]" id="security">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8 sm:p-12">
            <div className="grid gap-10 sm:grid-cols-3 text-center">
              <div className="space-y-3">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#6C5CE7]/10 mx-auto">
                  <Lock className="h-6 w-6 text-[#6C5CE7]" />
                </div>
                <h3 className="font-semibold text-gray-900">Securise</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Donnees hebergees en Suisse, chiffrement SSL, conforme RGPD
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#06b6d4]/10 mx-auto">
                  <Globe className="h-6 w-6 text-[#06b6d4]" />
                </div>
                <h3 className="font-semibold text-gray-900">Multi-tenant</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Chaque entreprise a ses propres donnees, totalement isolees
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#10b981]/10 mx-auto">
                  <Smartphone className="h-6 w-6 text-[#10b981]" />
                </div>
                <h3 className="font-semibold text-gray-900">Mobile first</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  PWA installable, optimisee pour le terrain et les livreurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#F8F7FF] to-white">
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900">
            Pret a simplifier
            <br />
            <span className="bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] bg-clip-text text-transparent">
              votre gestion ?
            </span>
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            Rejoignez les entreprises suisses qui font confiance a GestMat
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] text-white font-semibold rounded-xl px-8 py-4 hover:shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-[1.02]"
            >
              Demarrer l&apos;essai gratuit
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              onClick={handleStartDemo}
              disabled={demoLoading}
              className="group inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-8 py-4 hover:border-[#6C5CE7]/30 hover:text-[#6C5CE7] shadow-sm hover:shadow-md transition-all hover:scale-[1.02] disabled:opacity-60"
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Voir la demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 sm:grid-cols-3 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#a855f7]">
                  <Box className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">GestMat</span>
                <span className="text-sm">🇨🇭</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Solution suisse de gestion de parc materiel pour les entreprises de livraison et de transport.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <a href="mailto:admin@swissworkingdev.ch" className="hover:text-[#6C5CE7] transition-colors">admin@swissworkingdev.ch</a>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <a href="tel:+41783214103" className="hover:text-[#6C5CE7] transition-colors">078 321 41 03</a>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Rue de Bourg 27<br />1003 Lausanne, Suisse</span>
                </li>
              </ul>
            </div>

            {/* Liens */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Liens</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors">Fonctionnalites</a></li>
                <li><a href="#pricing" className="text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors">Tarifs</a></li>
                <li><a href="#security" className="text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors">Securite</a></li>
                <li><Link href="/login" className="text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors">Connexion</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Swiss Work Together Sarl. Tous droits reserves.
            </div>
            <div className="text-xs text-gray-400">
              Heberge en Suisse 🇨🇭
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento Card                                                          */
/* ------------------------------------------------------------------ */

function BentoCard({
  icon: Icon,
  title,
  desc,
  color,
  className = "",
  large = false,
}: {
  icon: any;
  title: string;
  desc: string;
  color: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-gray-200 bg-white p-6 hover:border-[#6C5CE7]/20 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 ${className}`}
    >
      <div className="relative">
        <div
          className="flex items-center justify-center h-10 w-10 rounded-xl mb-4"
          style={{ backgroundColor: `${color}12`, border: `1px solid ${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <h3 className={`font-semibold text-gray-900 mb-2 ${large ? "text-lg" : "text-sm"}`}>
          {title}
        </h3>
        <p className={`text-gray-500 leading-relaxed ${large ? "text-sm" : "text-xs"}`}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card                                                        */
/* ------------------------------------------------------------------ */

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  href,
  highlight = false,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
        highlight
          ? "bg-gradient-to-br from-[#6C5CE7]/5 to-[#a855f7]/5 border-2 border-[#6C5CE7]/30 shadow-lg shadow-purple-500/10"
          : "bg-white border border-gray-200 hover:border-[#6C5CE7]/20 hover:shadow-md"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] text-white text-xs font-semibold px-4 py-1 rounded-full">
          Populaire
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-sm font-medium text-gray-500">{name}</h3>
        <div className="mt-3">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          {period && <span className="text-sm text-gray-400 ml-1.5">{period}</span>}
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
            <CheckCircle className="h-3.5 w-3.5 text-[#10b981] flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`block text-center text-sm font-medium rounded-xl px-4 py-2.5 transition-all ${
          highlight
            ? "bg-gradient-to-r from-[#6C5CE7] to-[#a855f7] text-white hover:shadow-lg hover:shadow-purple-500/25"
            : "bg-gray-50 text-gray-700 hover:bg-[#6C5CE7]/5 hover:text-[#6C5CE7] border border-gray-200"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
