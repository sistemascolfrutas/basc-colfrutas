"use client";

import { useRef, useState } from "react";
import type { EmbarqueKit } from "@/lib/trazabilidad-kits";

export function EliminarEmbarqueButton({ embarque, onDeleted }: {
  embarque: EmbarqueKit;
  onDeleted: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  async function remove(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (!motivo.trim()) { setError("Escribe el motivo de la eliminación."); return; }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/embarques/${encodeURIComponent(embarque.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible eliminar el embarque.");
      dialog.current?.close();
      onDeleted(embarque.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible eliminar el embarque.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <>
    <button type="button" className="rounded-xl border border-rose-200 px-4 py-2 font-semibold text-rose-700" onClick={() => { setMotivo(""); setError(null); dialog.current?.showModal(); }}>Eliminar</button>
    <dialog ref={dialog} aria-labelledby={`eliminar-${embarque.id}`} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl p-6 shadow-xl backdrop:bg-black/50">
      <form onSubmit={remove} className="space-y-4">
        <h2 id={`eliminar-${embarque.id}`} className="text-xl font-semibold">Eliminar embarque {embarque.numero_embarque}</h2>
        <p>Kit: <strong>{embarque.numero_kit}</strong></p>
        <p className="text-sm text-slate-600">Se retirará de las listas operativas. Sus movimientos y evidencias se conservarán para auditoría junto con el motivo y el administrador responsable.</p>
        <label className="flex flex-col gap-2 font-medium">¿Por qué se elimina?
          <textarea autoFocus required maxLength={2000} rows={4} disabled={pending} value={motivo} onChange={(event) => setMotivo(event.target.value)} className="rounded-xl border p-3" />
        </label>
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={pending} onClick={() => dialog.current?.close()} className="rounded-xl border px-4 py-3">Cancelar</button>
          <button type="submit" disabled={pending || !motivo.trim()} className="rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Eliminando..." : "Confirmar eliminación"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
