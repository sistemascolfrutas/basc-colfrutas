"use client";

import { useEffect, useState, useTransition } from "react";

import type { ResponsableRecord } from "@/lib/responsables";

type ResponsableFormState = {
  nombre: string;
  isActive: boolean;
};

const initialForm: ResponsableFormState = {
  nombre: "",
  isActive: true,
};

export function AdminResponsablesPanel() {
  const [responsables, setResponsables] = useState<ResponsableRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResponsableFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        setResponsables(await loadResponsables());
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible cargar responsables.",
        );
      }
    });
  }, []);

  const isEditing = Boolean(editingId);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function startEdit(responsable: ResponsableRecord) {
    setEditingId(responsable.id);
    setForm({
      nombre: responsable.nombre,
      isActive: responsable.is_active,
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
          nombre: form.nombre,
          isActive: form.isActive,
        };

        if (editingId) {
          await updateResponsable(editingId, payload);
          setMessage("Responsable actualizado correctamente.");
        } else {
          await createResponsable(payload);
          setMessage("Responsable creado correctamente.");
        }

        setResponsables(await loadResponsables());
        resetForm();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible guardar el responsable.",
        );
      }
    });
  }

  function handleDelete(id: string) {
    setMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteResponsable(id);
        setResponsables(await loadResponsables());
        if (editingId === id) {
          resetForm();
        }
        setMessage("Responsable eliminado correctamente.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el responsable.",
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_28%),linear-gradient(180deg,_#f5fffc_0%,_#eef8f5_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="inline-flex rounded-full bg-teal-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-teal-800">
            Administracion
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Responsables
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administra las opciones visibles en los campos de responsables de
            los formularios.
          </p>
        </header>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">
                Catalogo
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {isEditing ? "Editar responsable" : "Crear responsable"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field
                label="Nombre"
                value={form.nombre}
                onChange={(value) =>
                  setForm((current) => ({ ...current, nombre: value }))
                }
                required
              />

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
                  className="h-4 w-4 accent-teal-600"
                />
                Opcion activa
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPending
                    ? "Guardando..."
                    : isEditing
                      ? "Actualizar responsable"
                      : "Crear responsable"}
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

          <section className="min-w-0 rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)] md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">Opciones registradas</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Las opciones activas aparecen en los formularios.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                {responsables.length} opcion(es)
              </span>
            </div>

            <div className="mt-6 min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-800">
              {responsables.length === 0 ? (
                <div className="bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                  No hay responsables registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] table-fixed border-collapse bg-slate-900/70 text-left text-sm">
                    <thead className="bg-slate-900 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="w-[52%] px-4 py-3">Nombre</th>
                        <th className="w-[18%] px-4 py-3">Estado</th>
                        <th className="w-[30%] px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {responsables.map((responsable) => (
                        <tr key={responsable.id} className="align-middle">
                          <td className="px-4 py-4">
                            <span
                              className="block truncate font-semibold text-white"
                              title={responsable.nombre}
                            >
                              {responsable.nombre}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={[
                                "inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                                responsable.is_active
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-slate-700 text-slate-300",
                              ].join(" ")}
                            >
                              {responsable.is_active ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => startEdit(responsable)}
                                className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(responsable.id)}
                                className="whitespace-nowrap rounded-xl border border-rose-700 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/50 disabled:cursor-not-allowed disabled:text-rose-800"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
      />
    </label>
  );
}

async function loadResponsables() {
  const response = await fetch("/api/admin/responsables", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible cargar responsables.");
  }

  return result as ResponsableRecord[];
}

async function createResponsable(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/responsables", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible crear el responsable.");
  }

  return result as ResponsableRecord;
}

async function updateResponsable(id: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/responsables/${id}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible actualizar el responsable.");
  }

  return result as ResponsableRecord;
}

async function deleteResponsable(id: string) {
  const response = await fetch(`/api/admin/responsables/${id}`, {
    method: "DELETE",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible eliminar el responsable.");
  }

  return result as { success: true };
}
