"use client";

import { useEffect, useState, useTransition } from "react";
import type { PrecintosEmpleado, PrecintosEmpleadoInput } from "@/lib/precintos-empleados";

const initialForm: PrecintosEmpleadoInput = { empresa: "COLFRUTAS", nombre: "", cedula: "", cargo: "", isActive: true };

export function AdminPrecintosEmpleadosPanel() {
  const [items, setItems] = useState<PrecintosEmpleado[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { startTransition(() => void refresh().catch(showError)); }, []);
  function showError(reason: unknown) { setError(reason instanceof Error ? reason.message : "No fue posible completar la operacion."); }
  async function refresh() { setItems(await requestEmployees()); }
  function reset() { setEditingId(null); setForm(initialForm); }
  function edit(item: PrecintosEmpleado) {
    setEditingId(item.id);
    setForm({ empresa: item.empresa, nombre: item.nombre, cedula: item.cedula, cargo: item.cargo ?? "", isActive: item.is_active });
    setMessage(null); setError(null);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(null); setError(null);
    startTransition(async () => {
      try {
        await saveEmployee(form, editingId);
        await refresh();
        setMessage(editingId ? "Empleado actualizado correctamente." : "Empleado creado correctamente.");
        reset();
      } catch (reason) { showError(reason); }
    });
  }
  function remove(id: string) {
    if (!window.confirm("¿Deseas eliminar este empleado?")) return;
    setMessage(null); setError(null);
    startTransition(async () => {
      try { await deleteEmployee(id); await refresh(); if (editingId === id) reset(); setMessage("Empleado eliminado correctamente."); }
      catch (reason) { showError(reason); }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#f5fffa_0%,_#eef8f2_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">Administracion</span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">Empleados de precintos</h1>
          <p className="mt-3 text-sm text-slate-600">Gestiona las listas de empleados COLFRUTAS y ATEMPI que aparecen en el formulario.</p>
        </header>
        <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={submit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg md:p-8">
            <h2 className="text-xl font-semibold text-slate-950">{editingId ? "Editar empleado" : "Crear empleado"}</h2>
            <label className="block text-sm font-medium text-slate-700">Empresa<select value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value, cargo: e.target.value === "ATEMPI" ? "" : form.cargo })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><option>COLFRUTAS</option><option>ATEMPI</option></select></label>
            <Field label="Nombre completo" value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} />
            <Field label="Cedula" value={form.cedula} onChange={(cedula) => setForm({ ...form, cedula })} />
            {form.empresa === "COLFRUTAS" ? <Field label="Cargo" value={form.cargo ?? ""} onChange={(cargo) => setForm({ ...form, cargo })} /> : null}
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Empleado activo</label>
            <div className="flex gap-3"><button disabled={isPending} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-400">{isPending ? "Guardando..." : editingId ? "Actualizar" : "Crear"}</button><button type="button" onClick={reset} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold">Limpiar</button></div>
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          </form>
          <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
            <div className="flex justify-between gap-4"><div><h2 className="text-xl font-semibold">Empleados registrados</h2><p className="mt-2 text-sm text-slate-300">Los empleados activos aparecen en PRECINTOS.</p></div><span className="h-fit rounded-full bg-slate-800 px-4 py-2 text-sm">{items.length}</span></div>
            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-800">
              <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Cedula</th><th className="px-4 py-3">Cargo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-800">{items.map((item) => <tr key={item.id}><td className="px-4 py-4 font-semibold text-emerald-300">{item.empresa}</td><td className="px-4 py-4">{item.nombre}</td><td className="px-4 py-4">{item.cedula}</td><td className="px-4 py-4">{item.cargo ?? "—"}</td><td className="px-4 py-4">{item.is_active ? "Activo" : "Inactivo"}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button onClick={() => edit(item)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs">Editar</button><button onClick={() => remove(item.id)} className="rounded-xl border border-rose-700 px-3 py-2 text-xs text-rose-300">Eliminar</button></div></td></tr>)}</tbody>
              </table>
              {items.length === 0 ? <p className="px-4 py-5 text-sm text-slate-300">No hay empleados registrados.</p> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>;
}

async function requestEmployees() { const response = await fetch("/api/admin/precintos-empleados", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result as PrecintosEmpleado[]; }
async function saveEmployee(payload: PrecintosEmpleadoInput, id: string | null) { const response = await fetch(id ? `/api/admin/precintos-empleados/${id}` : "/api/admin/precintos-empleados", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); }
async function deleteEmployee(id: string) { const response = await fetch(`/api/admin/precintos-empleados/${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); }
