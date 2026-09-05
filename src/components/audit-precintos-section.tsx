"use client";

import { useEffect, useState, useTransition } from "react";
import type { AuditPrecintoFilters, AuditPrecintoRecord } from "@/lib/audit-precintos";

export function AuditPrecintosSection() {
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState("");
  const [persona, setPersona] = useState("");
  const [numeroKit, setNumeroKit] = useState("");
  const [records, setRecords] = useState<AuditPrecintoRecord[]>([]);
  const [selected, setSelected] = useState<AuditPrecintoRecord | null>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { runSearch({}); }, []);

  function runSearch(filters: AuditPrecintoFilters) {
    setError(null);
    startTransition(async () => {
      try {
        const data = await requestPrecintos(filters);
        setRecords(data); setSelected(null);
        setMessage(data.length ? `${data.length} registro(s) de precintos encontrados.` : "No se encontraron registros de precintos.");
      } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible consultar precintos."); }
    });
  }

  return (
    <section className="space-y-6 border-t border-slate-200 pt-8">
      <header className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">Auditoria de precintos</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Entradas y salidas de precintos</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Consulta personas, kits, fotografías, observaciones, firmas y horarios registrados.</p>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); runSearch({ tipo, fecha, persona, numeroKit }); }} className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <div className="border-b border-slate-200 pb-4"><span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Filtros</span><h3 className="mt-2 text-xl font-semibold text-slate-950">Buscar precintos</h3></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_0.8fr_1fr_1fr_auto_auto] xl:items-end">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value)} className="min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base"><option value="">Entradas y salidas</option><option value="entrada">Entrada</option><option value="salida">Salida</option></select></label>
          <AuditField label="Fecha" type="date" value={fecha} onChange={setFecha} />
          <AuditField label="Persona o cedula" value={persona} onChange={setPersona} placeholder="Nombre o documento" />
          <AuditField label="Numero de kit" value={numeroKit} onChange={setNumeroKit} placeholder="Ej. KIT-001" />
          <button disabled={isPending} className="min-h-[52px] rounded-2xl bg-slate-950 px-7 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400">{isPending ? "Consultando..." : "Buscar"}</button>
          <button type="button" disabled={isPending} onClick={() => { setTipo(""); setFecha(""); setPersona(""); setNumeroKit(""); runSearch({}); }} className="min-h-[52px] rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">Limpiar</button>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </form>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><h3 className="text-xl font-semibold text-slate-950">Registros encontrados</h3><p className="mt-1 text-sm text-slate-600">Selecciona una fila para ver todos los datos y evidencias.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">{records.length} registro(s)</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.15em] text-slate-500"><tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Embarque</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Portería</th><th className="px-4 py-3">Comercio / Logística</th><th className="px-4 py-3">Kit</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{records.map((record) => <tr key={`${record.tipo}-${record.id}`} className={selected?.id === record.id && selected.tipo === record.tipo ? "bg-emerald-50" : "hover:bg-slate-50"}><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${record.tipo === "trazabilidad" ? "bg-emerald-100 text-emerald-800" : record.tipo === "entrada" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{record.tipo === "trazabilidad" ? "Entrada + salida" : record.tipo}</span></td><td className="px-4 py-4 font-semibold">{record.numero_embarque || "Histórico"}</td><td className="px-4 py-4">{formatDate(record.fecha)}<span className="block text-xs text-slate-500">{record.hora}</span></td><td className="px-4 py-4 font-medium">{record.empleado_atempi_nombre}</td><td className="px-4 py-4 font-medium">{record.empleado_colfrutas_nombre}</td><td className="px-4 py-4">{record.kits?.map((kit) => kit.numero).join(", ")}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => setSelected(record)} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Ver detalle</button></td></tr>)}</tbody></table></div>
      </section>

      {selected ? <PrecintoDetail record={selected} onPreview={(url, label) => setPreview({ url, label })} /> : null}
      {preview ? <ImageModal {...preview} onClose={() => setPreview(null)} /> : null}
    </section>
  );
}

function PrecintoDetail({ record, onPreview }: { record: AuditPrecintoRecord; onPreview: (url: string, label: string) => void }) {
  if (record.tipo === "trazabilidad") return <TraceabilityDetail record={record} onPreview={onPreview} />;
  const fields = [["Tipo", record.tipo], ["Embarque", record.numero_embarque || "Registro histórico"], ["Fecha", formatDate(record.fecha)], ["Hora inicial", record.hora], ["Hora final", record.hora_final], ["Acción", record.accion], ["Portería", record.empleado_atempi_nombre], ["Cédula Portería", record.empleado_atempi_cedula], [record.tipo === "entrada" ? "Auxiliar de Comercio" : "Logística", record.empleado_colfrutas_nombre], ["Cédula", record.empleado_colfrutas_cedula], ["Cargo", record.empleado_colfrutas_cargo], ["Cantidad de kits", String(record.cantidad_kits)], ["Observaciones", record.observaciones || "Sin observaciones"]];
  const images = [...(record.kits ?? []).map((kit) => ({ url: kit.foto_url, label: `Kit ${kit.numero}` })), { url: record.firma_empleado_atempi_url, label: "Firma empleado ATEMPI" }, { url: record.firma_empleado_colfrutas_url, label: "Firma empleado COLFRUTAS" }].filter((item) => item.url);
  return <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"><div><span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">{record.tipo} de precinto</span><h3 className="mt-2 text-xl font-semibold text-slate-950">Detalle del registro</h3></div><div className="overflow-hidden rounded-2xl border border-slate-200"><table className="w-full table-fixed text-sm"><tbody className="divide-y divide-slate-100">{fields.map(([label, value]) => <tr key={label}><th className="w-[34%] bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">{label}</th><td className="break-words px-4 py-3 font-medium text-slate-900">{value}</td></tr>)}</tbody></table></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((item) => <button type="button" key={item.label} onClick={() => onPreview(item.url, item.label)} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-left"><img src={item.url} alt={item.label} className="h-48 w-full object-contain" /><span className="block px-4 py-3 text-sm font-semibold text-white">{item.label}</span></button>)}</div></section>;
}

function TraceabilityDetail({ record, onPreview }: { record: AuditPrecintoRecord; onPreview: (url: string, label: string) => void }) {
  return <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"><div><span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Trazabilidad completa</span><h3 className="mt-2 text-2xl font-semibold text-slate-950">Embarque {record.numero_embarque}</h3><p className="mt-2 text-sm text-slate-600">Kit {record.kits[0]?.numero} · Creado {formatDate(record.fecha)} a las {record.hora}</p></div>{record.eliminado_en ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm"><strong>Embarque eliminado</strong><p className="mt-2 whitespace-pre-wrap">Motivo: {record.motivo_eliminacion}</p><p>Fecha: {new Date(record.eliminado_en).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p><p className="break-all">Administrador (ID): {record.eliminado_por}</p></div> : null}<div className="grid gap-6 lg:grid-cols-2"><MovementCard title="Entrada a Portería" movement={record.entrada} firstLabel="Auxiliar de Comercio" secondLabel="Portería" onPreview={onPreview} /><MovementCard title="Salida a Logística" movement={record.salida} firstLabel="Portería" secondLabel="Logística" onPreview={onPreview} /></div></section>;
}

function MovementCard({ title, movement, firstLabel, secondLabel, onPreview }: { title: string; movement: AuditPrecintoRecord["entrada"]; firstLabel: string; secondLabel: string; onPreview: (url: string, label: string) => void }) {
  if (!movement) return <article className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-6"><h4 className="text-lg font-semibold text-amber-900">{title}</h4><p className="mt-3 text-sm text-amber-800">Este paso todavía está pendiente.</p></article>;
  const date = new Date(movement.created_at);
  return <article className="space-y-5 rounded-3xl border border-slate-200 p-6"><div><h4 className="text-lg font-semibold text-slate-950">{title}</h4><p className="mt-1 text-sm text-slate-500">{date.toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p></div><dl className="grid gap-3 text-sm"><div><dt className="font-semibold text-slate-500">{firstLabel}</dt><dd>{movement.persona_uno_nombre} · {movement.persona_uno_cedula}</dd></div><div><dt className="font-semibold text-slate-500">{secondLabel}</dt><dd>{movement.persona_dos_nombre} · {movement.persona_dos_cedula}</dd></div><div><dt className="font-semibold text-slate-500">Observaciones</dt><dd>{movement.observaciones || "Sin observaciones"}</dd></div></dl><div className="grid grid-cols-3 gap-3"><EvidenceButton label="Foto del kit" url={movement.foto_url} onPreview={onPreview} /><EvidenceButton label={`Firma ${firstLabel}`} url={movement.firma_uno_url} onPreview={onPreview} /><EvidenceButton label={`Firma ${secondLabel}`} url={movement.firma_dos_url} onPreview={onPreview} /></div></article>;
}

function EvidenceButton({ label, url, onPreview }: { label: string; url: string; onPreview: (url: string, label: string) => void }) { return <button type="button" onClick={() => onPreview(url, label)} className="rounded-2xl bg-slate-950 px-3 py-3 text-xs font-semibold text-white">{label}</button>; }

function ImageModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-5xl rounded-[2rem] bg-white p-6"><div className="flex justify-between gap-4"><h3 className="text-xl font-semibold">{label}</h3><button type="button" onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-semibold">Cerrar</button></div><div className="mt-6 flex min-h-[420px] items-center justify-center rounded-3xl bg-slate-950"><img src={url} alt={label} className="max-h-[70vh] max-w-full object-contain" /></div></div></div>; }
function AuditField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base" /></label>; }
function formatDate(value: string) { if (!value) return "Sin fecha"; return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" }).format(new Date(`${value}T12:00:00-05:00`)); }
async function requestPrecintos(filters: AuditPrecintoFilters) { const response = await fetch("/api/audit/precintos/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filters) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "No fue posible consultar precintos."); return result as AuditPrecintoRecord[]; }
