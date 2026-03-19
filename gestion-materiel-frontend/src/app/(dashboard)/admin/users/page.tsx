"use client";

import { useEffect, useState } from "react";
import { listUsers, createUser, updateUserRole, deleteUser, type UserOut } from "@/lib/api/users";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCog, Trash2, Mail, UserPlus, User, Hash, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  EMPLOYEE: "bg-green-100 text-green-600 border-green-200",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employé",
};

function UsersContent() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await listUsers({ limit: 200 });
      setUsers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await updateUserRole(userId, role);
      fetch();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  const handleDelete = async (user: UserOut) => {
    const name = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name} (${user.email})`
      : user.email;
    if (!confirm(`Supprimer l'utilisateur ${name} ?\nL'employé associé sera aussi désactivé.`)) return;
    try {
      await deleteUser(user.id);
      fetch();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Gestion des utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${users.length} utilisateur(s)`}
          </p>
        </div>
        <CreateUserDialog onCreated={fetch} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : users.length === 0 ? (
        <div className="text-muted-foreground">Aucun utilisateur</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-xl border p-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#6C5CE7]/10 text-[#6C5CE7] h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold">
                  {u.first_name && u.last_name
                    ? `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase()
                    : u.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  {u.first_name && u.last_name ? (
                    <>
                      <div className="text-sm font-semibold">
                        {u.first_name} {u.last_name}
                        {u.employee_code && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">({u.employee_code})</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </>
                  ) : (
                    <div className="text-sm font-medium">{u.email}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-CH") : ""}
                  </div>
                </div>
                <Badge className={ROLE_COLORS[u.role] ?? ""} variant="secondary">
                  {ROLE_LABELS[u.role] ?? u.role}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={u.role}
                  onValueChange={(v) => handleRoleChange(u.id, v)}
                >
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EMPLOYEE">Employé</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 rounded-xl"
                  onClick={() => handleDelete(u)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmployeeCode("");
    setEmail("");
    setRole("EMPLOYEE");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!firstName.trim() || !lastName.trim() || !employeeCode.trim() || !email.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      await createUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        employee_code: employeeCode.trim(),
        email: email.trim(),
        role,
      });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        reset();
        onCreated();
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl">
          <UserPlus className="h-4 w-4 mr-1" />
          Ajouter un employé
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#6C5CE7]" />
            Nouvel employé
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-700">Employé créé avec succès !</p>
              <p className="text-sm text-muted-foreground mt-1">
                Un email de bienvenue avec les identifiants<br />a été envoyé à <strong>{email}</strong>
              </p>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Prénom *
                </Label>
                <Input
                  required
                  className="rounded-xl"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Nom *
                </Label>
                <Input
                  required
                  className="rounded-xl"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-[#6C5CE7]" />
                Code employé *
              </Label>
              <Input
                required
                className="rounded-xl"
                placeholder="EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-[#6C5CE7]" />
                Email *
              </Label>
              <Input
                type="email"
                required
                className="rounded-xl"
                placeholder="jean.dupont@exemple.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 p-3">
              <p className="text-xs text-[#6C5CE7]">
                🔐 Un mot de passe sera généré automatiquement.<br />
                📧 Un email de bienvenue avec les identifiants et un lien pour installer l'application PWA sera envoyé.
              </p>
            </div>

            {error && <div className="text-sm text-red-600">{String(error)}</div>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl">
                {submitting ? "Création…" : "Créer l'employé"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <UsersContent />
      </RequireRole>
    </RequireAuth>
  );
}
