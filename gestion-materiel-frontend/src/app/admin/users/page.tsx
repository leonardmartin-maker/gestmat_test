"use client";

import { useEffect, useState } from "react";
import { listUsers, createUser, updateUserRole, deleteUser, type UserOut } from "@/lib/api/users";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  ADMIN: "bg-red-100 text-red-800",
  MANAGER: "bg-blue-100 text-blue-800",
  EMPLOYEE: "bg-gray-100 text-gray-800",
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
    if (!confirm(`Supprimer l'utilisateur ${user.email} ?`)) return;
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
        <h1 className="text-xl font-semibold">Gestion des utilisateurs</h1>
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
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium">{u.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-CH") : ""}
                  </div>
                </div>
                <Badge className={ROLE_COLORS[u.role] ?? ""} variant="secondary">
                  {u.role}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={u.role}
                  onValueChange={(v) => handleRoleChange(u.id, v)}
                >
                  <SelectTrigger className="w-[140px]">
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
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(u)}
                >
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createUser({ email, password, role });
      setOpen(false);
      setEmail("");
      setPassword("");
      setRole("EMPLOYEE");
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ajouter un utilisateur</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe (min. 6 caractères)</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="EMPLOYEE">Employé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <div className="text-sm text-red-600">{String(error)}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              Créer
            </Button>
          </div>
        </form>
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
