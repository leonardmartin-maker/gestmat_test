"use client";

import { useState } from "react";
import { changePassword } from "@/lib/api/me";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent("");
    setNewPwd("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPwd.length < 6) {
      setError("Le nouveau mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (newPwd !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, newPwd);
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
          Changer le mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#6C5CE7]" />
            Changer le mot de passe
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="cp-current">Mot de passe actuel</Label>
            <Input
              id="cp-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-new">Nouveau mot de passe</Label>
            <Input
              id="cp-new"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-confirm">Confirmer</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Mot de passe modifié</p>}
          <Button className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white" type="submit" disabled={loading}>
            {loading ? "…" : "Modifier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
