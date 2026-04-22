"use client";

import { useEffect, useState, useTransition } from "react";

import {
  APP_ROLES,
  FORM_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type AppRole,
  type AppUserRecord,
  getDefaultPermissionsForRole,
} from "@/lib/app-users";

type UserFormState = {
  email: string;
  fullName: string;
  role: AppRole;
  permissions: string[];
  isActive: boolean;
  password: string;
};

const initialForm: UserFormState = {
  email: "",
  fullName: "",
  role: "porteria",
  permissions: getDefaultPermissionsForRole("porteria"),
  isActive: true,
  password: "",
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        setUsers(await loadUsers());
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No fue posible cargar usuarios.",
        );
      }
    });
  }, []);

  const isEditing = Boolean(editingUserId);

  function resetForm() {
    setEditingUserId(null);
    setForm(initialForm);
  }

  function handleRoleChange(role: AppRole) {
    setForm((current) => ({
      ...current,
      permissions: getDefaultPermissionsForRole(role),
      role,
    }));
  }

  function togglePermission(permission: string) {
    setForm((current) => {
      const exists = current.permissions.includes(permission);
      return {
        ...current,
        permissions: exists
          ? current.permissions.filter((value) => value !== permission)
          : [...current.permissions, permission],
      };
    });
  }

  function startEdit(user: AppUserRecord) {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      fullName: user.full_name ?? "",
      isActive: user.is_active,
      password: "",
      permissions: user.permissions.filter((value) =>
        FORM_PERMISSIONS.includes(value as (typeof FORM_PERMISSIONS)[number]),
      ),
      role: user.role,
    });
    setMessage(null);
    setErrorMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          email: form.email,
          fullName: form.fullName,
          isActive: form.isActive,
          password: form.password,
          permissions: form.permissions,
          role: form.role,
        };

        if (editingUserId) {
          await updateUser(editingUserId, payload);
          setMessage("Usuario actualizado correctamente.");
        } else {
          await createUser(payload);
          setMessage("Usuario creado correctamente.");
        }

        setUsers(await loadUsers());
        resetForm();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No fue posible guardar el usuario.",
        );
      }
    });
  }

  function handleDelete(userId: string) {
    setMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteUser(userId);
        setUsers(await loadUsers());
        if (editingUserId === userId) {
          resetForm();
        }
        setMessage("Usuario eliminado correctamente.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No fue posible eliminar el usuario.",
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_30%),linear-gradient(180deg,_#f7fcf8_0%,_#eef6f0_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">
            Administracion
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Gestion de usuarios
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Crea cuentas, activa o desactiva accesos y asigna formularios segun
            el perfil operativo de cada persona.
          </p>
        </header>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">
                Formulario
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {isEditing ? "Editar usuario" : "Crear usuario"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field
                label="Correo"
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                type="email"
                required
              />
              <Field
                label="Nombre completo"
                value={form.fullName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, fullName: value }))
                }
              />
              <Field
                label={isEditing ? "Nueva contrasena (opcional)" : "Contrasena inicial"}
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                type="password"
                required={!isEditing}
              />

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Rol
                <select
                  value={form.role}
                  onChange={(event) => handleRoleChange(event.target.value as AppRole)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                >
                  {APP_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <legend className="px-2 text-sm font-medium text-slate-700">
                  Formularios permitidos
                </legend>

                {form.role === "admin" ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Los administradores reciben acceso completo a formularios,
                    auditoria y gestion de usuarios.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {FORM_PERMISSIONS.map((permission) => {
                      const checked = form.permissions.includes(permission);
                      return (
                        <label
                          key={permission}
                          className={[
                            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                            checked
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white text-slate-700",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission)}
                            className="h-4 w-4 accent-current"
                          />
                          {PERMISSION_LABELS[permission]}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                Usuario activo
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPending
                    ? "Guardando..."
                    : isEditing
                      ? "Actualizar usuario"
                      : "Crear usuario"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Limpiar
                </button>
              </div>

              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {message}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)] md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Usuarios registrados</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Cada usuario puede iniciar sesion con Supabase Auth y queda
                  habilitado segun los permisos guardados en `app_users`.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                {users.length} usuario(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {users.length === 0 ? (
                <div className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                  No hay usuarios registrados.
                </div>
              ) : (
                users.map((user) => (
                  <article
                    key={user.id}
                    className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                          {ROLE_LABELS[user.role]}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {user.full_name || user.email}
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                      </div>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          user.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300",
                        ].join(" ")}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          {PERMISSION_LABELS[permission]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => startEdit(user)}
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(user.id)}
                        className="rounded-2xl border border-rose-700 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-950/50 disabled:cursor-not-allowed disabled:text-rose-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

async function loadUsers() {
  const response = await fetch("/api/admin/users", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible cargar usuarios.");
  }

  return result as AppUserRecord[];
}

async function createUser(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/users", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible crear el usuario.");
  }

  return result as AppUserRecord;
}

async function updateUser(userId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible actualizar el usuario.");
  }

  return result as AppUserRecord;
}

async function deleteUser(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible eliminar el usuario.");
  }

  return result as { success: true };
}
