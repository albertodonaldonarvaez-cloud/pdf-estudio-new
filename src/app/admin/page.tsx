"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  Shield,
  User,
  HardDrive,
  FileText,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  storageLimit: number;
  storageUsed: number;
  isActive: boolean;
  createdAt: string;
  _count: { documents: number };
}

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  storageLimit: number;
  storageUsed: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    storageLimit: 50,
    role: "USER" as "ADMIN" | "USER",
  });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/auth/me"),
      ]);

      if (usersRes.status === 403 || meRes.status === 401) {
        router.push("/login");
        return;
      }

      const usersData = await usersRes.json();
      const meData = await meRes.json();

      setUsers(usersData.users || []);
      setCurrentUser(meData.user);
    } catch (error) {
      console.error("Error fetching data:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }

      toast.success("Usuario creado exitosamente");
      setIsDialogOpen(false);
      setFormData({ email: "", password: "", name: "", storageLimit: 50, role: "USER" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          storageLimit: formData.storageLimit,
          role: formData.role,
          password: formData.password || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar usuario");
      }

      toast.success("Usuario actualizado");
      setEditingUser(null);
      setFormData({ email: "", password: "", name: "", storageLimit: 50, role: "USER" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Usuario eliminado");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar");
      }

      toast.success(user.isActive ? "Usuario desactivado" : "Usuario activado");
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar usuario");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ email: "", password: "", name: "", storageLimit: 50, role: "USER" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      storageLimit: user.storageLimit,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-violet-500" />
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Panel de Administración
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{currentUser?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.length}
                  </p>
                  <p className="text-xs text-slate-500">Usuarios totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.filter((u) => u.isActive).length}
                  </p>
                  <p className="text-xs text-slate-500">Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.filter((u) => u.role === "ADMIN").length}
                  </p>
                  <p className="text-xs text-slate-500">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Math.round(users.reduce((acc, u) => acc + u.storageUsed, 0))} MB
                  </p>
                  <p className="text-xs text-slate-500">Almacenamiento usado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Usuarios</CardTitle>
            <Button onClick={openCreateDialog} className="bg-violet-500 hover:bg-violet-600">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rol</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Almacenamiento</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Documentos</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {user.name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={user.role === "ADMIN" ? "default" : "secondary"}
                          className={
                            user.role === "ADMIN"
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                              : ""
                          }
                        >
                          {user.role === "ADMIN" ? "Admin" : "Usuario"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{user.storageUsed} MB</span>
                            <span>{user.storageLimit} MB</span>
                          </div>
                          <Progress
                            value={(user.storageUsed / user.storageLimit) * 100}
                            className="h-2"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{user._count.documents}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          className={
                            user.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          }
                        >
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.isActive ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Crear Usuario"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser}
                placeholder="usuario@email.com"
              />
            </div>

            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <Label>Contraseña {editingUser && "(dejar vacío para mantener)"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label>Límite de almacenamiento (MB)</Label>
              <Input
                type="number"
                value={formData.storageLimit}
                onChange={(e) => setFormData({ ...formData, storageLimit: parseInt(e.target.value) })}
                min={10}
                max={1000}
              />
            </div>

            <div>
              <Label>Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as "ADMIN" | "USER" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
