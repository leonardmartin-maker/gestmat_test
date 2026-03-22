"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import {
  getSubscription,
  getCompanyInfo,
  updateCompanyInfo,
  type SubscriptionResponse,
  type CompanyOut,
} from "@/lib/api/subscription";
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/lib/api/billing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Building2,
  CreditCard,
  Users,
  Truck,
  Shield,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  ExternalLink,
  Fuel,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <SettingsClient />
      </RequireRole>
    </RequireAuth>
  );
}

function SettingsClient() {
  const searchParams = useSearchParams();
  const [subData, setSubData] = useState<SubscriptionResponse | null>(null);
  const [company, setCompany] = useState<CompanyOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [withFuel, setWithFuel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Company form
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sub, comp] = await Promise.all([
        getSubscription(),
        getCompanyInfo().catch(() => null),
      ]);
      setSubData(sub);
      if (comp) {
        setCompany(comp);
        setCompanyName(comp.name || "");
        setContactEmail(comp.contact_email || "");
        setPhone(comp.phone || "");
        setAddress(comp.address || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Handle Stripe checkout return
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setSuccessMessage("Paiement effectue avec succes ! Votre abonnement est maintenant actif.");
      // Reload to get updated subscription
      setTimeout(() => load(), 1500);
    }
  }, [searchParams]);

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await updateCompanyInfo({
        name: companyName,
        contact_email: contactEmail,
        phone,
        address,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (planCode: string) => {
    setCheckoutLoading(true);
    try {
      const { checkout_url } = await createCheckoutSession(planCode, withFuel);
      window.location.href = checkout_url;
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur lors de la creation de la session de paiement");
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { portal_url } = await createCustomerPortalSession();
      window.location.href = portal_url;
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
      setPortalLoading(false);
    }
  };

  const sub = subData?.subscription;
  const limits = subData?.limits;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      TRIAL: { label: "Essai", cls: "bg-blue-100 text-blue-700" },
      ACTIVE: { label: "Actif", cls: "bg-green-100 text-green-700" },
      PAST_DUE: { label: "Impaye", cls: "bg-red-100 text-red-700" },
      CANCELLED: { label: "Annule", cls: "bg-gray-100 text-gray-700" },
      EXPIRED: { label: "Expire", cls: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-700" };
    return <Badge variant="secondary" className={`text-xs ${s.cls}`}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  const hasStripeSubscription = !!sub?.stripe_subscription_id;
  const canSubscribe = sub?.status === "TRIAL" || sub?.status === "EXPIRED" || sub?.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" style={{ color: "#6C5CE7" }} />
          Parametres
        </h1>
        <p className="text-sm text-muted-foreground">
          Entreprise, abonnement et facturation
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-green-800 text-sm">{successMessage}</div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Trial warning */}
      {sub?.status === "TRIAL" && limits?.trial_ends_at && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-800 text-sm">Periode d&apos;essai</div>
            <div className="text-sm text-blue-700">
              Votre essai se termine le{" "}
              <strong>
                {new Date(limits.trial_ends_at).toLocaleDateString("fr-CH")}
              </strong>
              . Abonnez-vous pour continuer a utiliser GestMat.
            </div>
          </div>
        </div>
      )}

      {/* Expired/Past due warning */}
      {(sub?.status === "EXPIRED" || sub?.status === "PAST_DUE") && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800 text-sm">
              {sub.status === "PAST_DUE" ? "Paiement en retard" : "Abonnement expire"}
            </div>
            <div className="text-sm text-red-700">
              {sub.status === "PAST_DUE"
                ? "Veuillez mettre a jour votre moyen de paiement pour continuer."
                : "Votre periode d'essai est terminee. Abonnez-vous pour continuer."}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#6C5CE7]" />
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l&apos;entreprise</Label>
              <Input
                className="rounded-xl"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input
                className="rounded-xl"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input
                className="rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                className="rounded-xl"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <Button
              className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
              onClick={handleSaveCompany}
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>

        {/* Current subscription */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#6C5CE7]" />
              Abonnement actuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sub ? (
              <>
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-[#6C5CE7]" />
                  <div>
                    <div className="font-semibold">{sub.plan_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sub.plan_code === "STANDARD"
                        ? "4 CHF / employe / mois"
                        : sub.plan_code === "TRIAL"
                        ? "Essai gratuit 14 jours"
                        : sub.plan_code}
                    </div>
                  </div>
                  {statusBadge(sub.status)}
                </div>

                {limits && (
                  <div className="space-y-2 pt-2">
                    <LimitRow
                      icon={Users}
                      label="Employes"
                      max={limits.max_employees}
                      extra={limits.extra_employees}
                    />
                    <LimitRow
                      icon={Truck}
                      label="Vehicules"
                      max={limits.max_vehicles}
                    />
                    <LimitRow
                      icon={Shield}
                      label="Equipements"
                      max={limits.max_assets}
                    />
                  </div>
                )}

                {sub.current_period_end && (
                  <div className="text-xs text-muted-foreground pt-2">
                    Prochaine facturation :{" "}
                    <strong>{new Date(sub.current_period_end).toLocaleDateString("fr-CH")}</strong>
                  </div>
                )}

                {/* Stripe billing portal */}
                {hasStripeSubscription && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2 text-sm w-full"
                      onClick={handlePortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Gerer la facturation
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Aucun abonnement actif
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscribe / Upgrade section */}
      {canSubscribe && (
        <Card className="rounded-2xl shadow-sm border-[#6C5CE7]/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#6C5CE7]" />
              S&apos;abonner a GestMat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Standard */}
            <div className="rounded-2xl border-2 border-[#6C5CE7]/30 bg-[#6C5CE7]/5 p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="font-bold text-lg text-gray-900">Plan Standard</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Tout inclus : vehicules, EPI, QR, incidents, maintenance, dashboard
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-gray-900">4 CHF</span>
                    <span className="text-sm text-gray-500 ml-1">/ employe / mois</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Vehicules & EPI illimites
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  QR codes & scan mobile
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Incidents & maintenance
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Dashboard temps reel
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Support email
                </div>
              </div>

              {/* Fuel option */}
              <div className="mt-4 rounded-xl bg-white border border-gray-200 p-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  id="fuel-option"
                  checked={withFuel}
                  onChange={(e) => setWithFuel(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]"
                />
                <label htmlFor="fuel-option" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-[#f97316]" />
                    <span className="text-sm font-medium text-gray-900">Module tickets carburant</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Photo, OCR automatique, validation manager</div>
                </label>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">+0.50 CHF</div>
                  <div className="text-xs text-gray-400">/ empl. / mois</div>
                </div>
              </div>

              <Button
                className="mt-4 w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white py-3 text-base gap-2"
                onClick={() => handleCheckout("STANDARD")}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirection vers Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    S&apos;abonner — {withFuel ? "4.50" : "4.00"} CHF / employe / mois
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-400 mt-2">
                Paiement securise par Stripe. Annulable a tout moment.
              </p>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
              <div className="font-semibold text-gray-900">Plan Entreprise</div>
              <div className="text-sm text-gray-500 mt-1">50+ employes — Support dedie, SLA, personnalisation</div>
              <a
                href="mailto:admin@swissworkingdev.ch"
                className="inline-flex items-center gap-2 mt-3 text-sm text-[#6C5CE7] hover:underline"
              >
                Nous contacter pour un devis
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LimitRow({
  icon: Icon,
  label,
  max,
  extra,
}: {
  icon: any;
  label: string;
  max: number;
  extra?: number;
}) {
  const isUnlimited = max <= 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="font-medium">
        {isUnlimited ? (
          "Illimite"
        ) : (
          <>
            {max}
            {extra ? (
              <span className="text-xs text-muted-foreground ml-1">(+{extra} suppl.)</span>
            ) : null}
          </>
        )}
      </span>
    </div>
  );
}
