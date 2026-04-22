"use client";

import { useEffect, useState, useTransition } from "react";

import type { Fsu03ParticipantRecord } from "@/lib/fsu03-participants";

type ParticipantFormState = {
  nombre: string;
  isActive: boolean;
};

const initialForm: ParticipantFormState = {
  nombre: "",
  isActive: true,
};

export function AdminFsu03ParticipantsPanel() {
  const [participants, setParticipants] = useState<Fsu03ParticipantRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipantFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        setParticipants(await loadParticipants());
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible cargar participantes F-SU-03.",
        );
      }
    });
  }, []);

  const isEditing = Boolean(editingId);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function startEdit(participant: Fsu03ParticipantRecord) {
    setEditingId(participant.id);
    setForm({
      nombre: participant.nombre,
      isActive: participant.is_active,
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
          await updateParticipant(editingId, payload);
          setMessage("Participante F-SU-03 actualizado correctamente.");
        } else {
          await createParticipant(payload);
          setMessage("Participante F-SU-03 creado correctamente.");
        }

        setParticipants(await loadParticipants());
        resetForm();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible guardar el participante F-SU-03.",
        );
      }
    });
  }

  function handleDelete(id: string) {
    setMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deleteParticipant(id);
        setParticipants(await loadParticipants());
        if (editingId === id) {
          resetForm();
        }
        setMessage("Participante F-SU-03 eliminado correctamente.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el participante F-SU-03.",
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.14),_transparent_28%),linear-gradient(180deg,_#fff8f8_0%,_#f9f0f2_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="inline-flex rounded-full bg-rose-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-rose-800">
            Administracion
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Participantes F-SU-03
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administra las opciones visibles en los campos de participantes del
            formulario F-SU-03.
          </p>
        </header>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-rose-700">
                Catalogo
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {isEditing ? "Editar participante" : "Crear participante"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field
                label="Nombre"
                value={form.nombre}
                onChange={(value) => setForm((current) => ({ ...current, nombre: value }))}
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
                  className="h-4 w-4 accent-rose-600"
                />
                Opcion activa
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPending
                    ? "Guardando..."
                    : isEditing
                      ? "Actualizar participante"
                      : "Crear participante"}
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
                <h2 className="text-xl font-semibold">Opciones registradas</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Las opciones activas aparecen en el formulario F-SU-03 en el
                  orden configurado.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                {participants.length} opcion(es)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {participants.length === 0 ? (
                <div className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                  No hay participantes registrados.
                </div>
              ) : (
                participants.map((participant) => (
                  <article
                    key={participant.id}
                    className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {participant.nombre}
                        </h3>
                      </div>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          participant.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-700 text-slate-300",
                        ].join(" ")}
                      >
                        {participant.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => startEdit(participant)}
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(participant.id)}
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
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-rose-500 focus:bg-white"
      />
    </label>
  );
}

async function loadParticipants() {
  const response = await fetch("/api/admin/fsu03-participants", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible cargar participantes F-SU-03.");
  }

  return result as Fsu03ParticipantRecord[];
}

async function createParticipant(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/fsu03-participants", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible crear el participante F-SU-03.");
  }

  return result as Fsu03ParticipantRecord;
}

async function updateParticipant(id: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/fsu03-participants/${id}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "No fue posible actualizar el participante F-SU-03.",
    );
  }

  return result as Fsu03ParticipantRecord;
}

async function deleteParticipant(id: string) {
  const response = await fetch(`/api/admin/fsu03-participants/${id}`, {
    method: "DELETE",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible eliminar el participante F-SU-03.");
  }

  return result as { success: true };
}
