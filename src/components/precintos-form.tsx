"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FileField, FloatingNotice, InputField, SectionTitle, SelectField } from "@/components/form-ui";
import { SignaturePad } from "@/components/signature-pad";
import { PRECINTOS_ACCION } from "@/lib/precintos";
import type { PrecintosEmpleado } from "@/lib/precintos-empleados";
import { SALIDA_PRECINTOS_ACCION } from "@/lib/salida-precintos";

type KitState = { numero: string; foto: File | null };
const emptyKit = (): KitState => ({ numero: "", foto: null });
const photoQuantityOptions = Array.from({ length: 10 }, (_, index) => String(index + 1));

export function PrecintosForm({ mode = "entrada" }: { mode?: "entrada" | "salida" }) {
  const isSalida = mode === "salida";
  const moduleTitle = isSalida ? "SALIDA DE PRECINTO" : "ENTRADA DE PRECINTO";
  const action = isSalida ? SALIDA_PRECINTOS_ACCION : PRECINTOS_ACCION;
  const [empleados, setEmpleados] = useState<PrecintosEmpleado[]>([]);
  const [colfrutasId, setColfrutasId] = useState("");
  const [atempiId, setAtempiId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [kits, setKits] = useState<KitState[]>([emptyKit()]);
  const [observaciones, setObservaciones] = useState("");
  const [firmaAtempi, setFirmaAtempi] = useState<File | null>(null);
  const [firmaColfrutas, setFirmaColfrutas] = useState<File | null>(null);
  const [signatureReset, setSignatureReset] = useState(0);
  const [clock, setClock] = useState(() => new Date());
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadEmpleados().then(setEmpleados).catch((error) => setErrorMessage(error instanceof Error ? error.message : "No fue posible cargar empleados."));
  }, []);

  const colfrutas = useMemo(() => empleados.filter((item) => item.empresa === "COLFRUTAS"), [empleados]);
  const atempi = useMemo(() => empleados.filter((item) => item.empresa === "ATEMPI"), [empleados]);
  const selectedColfrutas = colfrutas.find((item) => item.id === colfrutasId);
  const selectedAtempi = atempi.find((item) => item.id === atempiId);

  function changeCantidad(value: string) {
    const next = Number(value);
    setCantidad(next);
    setKits((current) => Array.from({ length: next }, (_, index) => current[index] ?? emptyKit()));
  }

  function updateKit(index: number, patch: Partial<KitState>) {
    setKits((current) => current.map((kit, kitIndex) => kitIndex === index ? { ...kit, ...patch } : kit));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("empleadoColfrutasId", colfrutasId);
        payload.set("empleadoAtempiId", atempiId);
        payload.set("cantidadKits", String(cantidad));
        payload.set("observaciones", observaciones);
        if (firmaAtempi) payload.set("firmaEmpleadoAtempi", firmaAtempi);
        if (firmaColfrutas) payload.set("firmaEmpleadoColfrutas", firmaColfrutas);
        kits.forEach((kit, index) => {
          payload.set(`numeroKit${index}`, kit.numero);
          if (kit.foto) payload.set(`fotoKit${index}`, kit.foto);
        });
        const response = await fetch(isSalida ? "/api/salida-precintos" : "/api/precintos", { method: "POST", body: payload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No fue posible guardar la asignacion.");
        setMessage(`${isSalida ? "Salida" : "Entrada"} de precinto guardada correctamente.`);
        setColfrutasId("");
        setAtempiId("");
        setCantidad(1);
        setKits([emptyKit()]);
        setObservaciones("");
        setFirmaAtempi(null);
        setFirmaColfrutas(null);
        setSignatureReset((current) => current + 1);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No fue posible guardar la asignacion.");
      }
    });
  }

  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(clock);
  const hora = new Intl.DateTimeFormat("es-CO", { timeStyle: "medium", timeZone: "America/Bogota" }).format(clock);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,_#f2fff8_0%,_#eef6f0_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">{moduleTitle}</span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{isSalida ? "Salida de precinto" : "Entrada de precinto"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Registra la entrega de ATEMPI y la recepcion de COLFRUTAS, con los kits de seguridad y sus evidencias fotograficas.</p>
            </div>
            <Link href="/" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Volver al inicio</Link>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
          <SectionTitle eyebrow="Datos automaticos" title="Fecha, hora y accion" tone="sky" />
          <div className="grid gap-4 md:grid-cols-3">
            <InputField label="Fecha" value={fecha} onChange={() => undefined} disabled />
            <InputField label="Hora de inicio" value={hora} onChange={() => undefined} disabled />
            <InputField label="Accion a realizar" value={action} onChange={() => undefined} disabled />
          </div>

          <SectionTitle eyebrow="Participantes" title="Entrega y custodia" tone="sky" />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Nombre empleado COLFRUTAS" value={colfrutasId} onChange={setColfrutasId} options={colfrutas.map((item) => ({ value: item.id, label: item.nombre }))} required tone="sky" />
            <SelectField label="Nombre empleado ATEMPI" value={atempiId} onChange={setAtempiId} options={atempi.map((item) => ({ value: item.id, label: item.nombre }))} required tone="sky" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InputField label="Cedula empleado COLFRUTAS" value={selectedColfrutas?.cedula ?? ""} onChange={() => undefined} disabled />
            <InputField label="Cargo empleado COLFRUTAS" value={selectedColfrutas?.cargo ?? ""} onChange={() => undefined} disabled />
            <InputField label="Cedula empleado ATEMPI" value={selectedAtempi?.cedula ?? ""} onChange={() => undefined} disabled />
          </div>

          <SectionTitle eyebrow="Kits de seguridad" title="Numeros y fotografias" tone="sky" />
          <SelectField label="Cantidad de fotos de kits de seguridad" value={String(cantidad)} onChange={changeCantidad} options={photoQuantityOptions} required tone="sky" />
          <div className="grid gap-5 md:grid-cols-2">
            {kits.map((kit, index) => (
              <section key={index} className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5">
                <h3 className="font-semibold text-slate-950">Kit de seguridad {index + 1}</h3>
                <InputField label={`Numero kit de seguridad ${index + 1}`} value={kit.numero} onChange={(numero) => updateKit(index, { numero })} required />
                <FileField label={`Fotografia del kit ${index + 1}`} file={kit.foto} onChange={(foto) => updateKit(index, { foto })} sourceOptions />
              </section>
            ))}
          </div>
          <SectionTitle eyebrow="Cierre de entrega" title="Observaciones y firmas" tone="sky" />
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Observaciones
            <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} rows={4} placeholder="Registra novedades u observaciones de la entrega" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-sky-500 focus:bg-white" />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <SignaturePad key={`atempi-${signatureReset}`} label="Firma empleado ATEMPI quien entrega" onChange={setFirmaAtempi} />
            <SignaturePad key={`colfrutas-${signatureReset}`} label="Firma empleado COLFRUTAS quien recibe" onChange={setFirmaColfrutas} />
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            La hora final se registrara automaticamente al guardar la asignacion.
          </div>
          <button type="submit" disabled={isPending || empleados.length === 0} className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isPending ? "Guardando asignacion..." : `Guardar ${isSalida ? "salida" : "entrada"} de precinto`}
          </button>
          {empleados.length === 0 ? <p className="text-center text-sm text-amber-700">Un administrador debe registrar empleados de COLFRUTAS y ATEMPI antes de usar el formulario.</p> : null}
        </form>
      </main>
      <FloatingNotice message={message} errorMessage={errorMessage} savedRecord={null} />
    </div>
  );
}

async function loadEmpleados() {
  const response = await fetch("/api/precintos-empleados", { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No fue posible cargar empleados.");
  return result as PrecintosEmpleado[];
}
