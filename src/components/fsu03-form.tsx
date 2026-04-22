"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  BooleanField,
  FileField,
  FloatingNotice,
  InputField,
  OperationPreviewCard,
  SectionTitle,
  SelectField,
  TextAreaField,
} from "@/components/form-ui";
import {
  type EvidenciasFsu03Input,
  type Fsu03Input,
  PARTICIPANTE_OPTIONS,
} from "@/lib/fsu03";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";

const initialForm: Fsu03Input = {
  fechaCargue: "",
  placa: "",
  seRealizoCargue: null,
  observacionesCargue: "",
  participante1: "",
  participante2: "",
  participante3: "",
};

const initialFiles: EvidenciasFsu03Input = {
  fotoPomaRemisionCargue: null,
  fotoCargue25: null,
  fotoCargue50: null,
  fotoCargue75: null,
  fotoCargue100: null,
};

export function Fsu03Form() {
  const [form, setForm] = useState<Fsu03Input>(initialForm);
  const [files, setFiles] = useState(initialFiles);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<Record<string, unknown> | null>(
    null,
  );

  const normalizedPlate = normalizePlate(form.placa);
  const normalizedDate = normalizeOperationDate(form.fechaCargue);
  const operationName =
    normalizedPlate && normalizedDate
      ? buildNombreOperacion(normalizedPlate, normalizedDate)
      : "";

  function setField(name: keyof Fsu03Input, value: string | boolean | null) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function setFile(name: keyof EvidenciasFsu03Input, file: File | null) {
    setFiles((current) => ({
      ...current,
      [name]: file,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setSavedRecord(null);

    startTransition(async () => {
      try {
        const data = await submitFsu03(form, files);
        setSavedRecord(data);
        setMessage(
          "F-SU-03 guardado correctamente. La operacion maestra quedo actualizada.",
        );
        setForm(initialForm);
        setFiles(initialFiles);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible guardar el formulario.",
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.16),_transparent_30%),linear-gradient(180deg,_#fff7f7_0%,_#f8f1f3_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-rose-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-rose-800">
                Formulario real
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                F-SU-03 Cargue y Aseguramiento
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Registra el soporte del cargue, los participantes y las evidencias
                del avance de la operacion.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Volver al inicio
              </Link>
              <Link
                href="/fsu-02"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-100"
              >
                Ver F-SU-02
              </Link>
            </div>
          </div>
        </header>

        <OperationPreviewCard
          placa={normalizedPlate}
          fecha={normalizedDate}
          operationName={operationName}
        />

        <div className="grid gap-8">
          <form
            onSubmit={handleSubmit}
            className="min-w-0 space-y-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8"
          >
            <SectionTitle
              eyebrow="Identificacion minima"
              title="Datos base del cargue"
              tone="rose"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Fecha de cargue"
                type="date"
                value={form.fechaCargue}
                onChange={(value) => setField("fechaCargue", value)}
                required
              />
              <InputField
                label="Placa del vehiculo"
                value={form.placa}
                onChange={(value) => setField("placa", value)}
                placeholder="Ej. BNL26F"
                required
              />
            </div>

            <SectionTitle
              eyebrow="Documento soporte"
              title="POMA o remision"
              tone="rose"
            />

            <FileField
              label="Foto de POMA o remision de cargue"
              file={files.fotoPomaRemisionCargue}
              onChange={(file) => setFile("fotoPomaRemisionCargue", file)}
            />

            <SectionTitle
              eyebrow="Ejecucion del cargue"
              title="Estado de la actividad"
              tone="rose"
            />

            <BooleanField
              label="Se realizo el cargue"
              value={form.seRealizoCargue}
              onChange={(value) => setField("seRealizoCargue", value)}
              tone="rose"
            />

            <TextAreaField
              label="Observaciones del cargue"
              value={form.observacionesCargue}
              onChange={(value) => setField("observacionesCargue", value)}
              required
              tone="rose"
            />

            <SectionTitle
              eyebrow="Participantes"
              title="Equipo presente en el cargue"
              tone="rose"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Participante 1"
                value={form.participante1}
                onChange={(value) => setField("participante1", value)}
                options={PARTICIPANTE_OPTIONS}
                required
                tone="rose"
              />
              <SelectField
                label="Participante 2"
                value={form.participante2}
                onChange={(value) => setField("participante2", value)}
                options={PARTICIPANTE_OPTIONS}
                required
                tone="rose"
              />
              <SelectField
                label="Participante 3"
                value={form.participante3}
                onChange={(value) => setField("participante3", value)}
                options={PARTICIPANTE_OPTIONS}
                required
                tone="rose"
              />
            </div>

            <SectionTitle
              eyebrow="Seguimiento del llenado"
              title="Evidencias por avance"
              tone="rose"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FileField
                label="Foto del cargue 25%"
                file={files.fotoCargue25}
                onChange={(file) => setFile("fotoCargue25", file)}
              />
              <FileField
                label="Foto del cargue 50%"
                file={files.fotoCargue50}
                onChange={(file) => setFile("fotoCargue50", file)}
              />
              <FileField
                label="Foto del cargue 75%"
                file={files.fotoCargue75}
                onChange={(file) => setFile("fotoCargue75", file)}
              />
              <FileField
                label="Foto del cargue 100%"
                file={files.fotoCargue100}
                onChange={(file) => setFile("fotoCargue100", file)}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? "Guardando F-SU-03..." : "Guardar F-SU-03"}
            </button>

            <p className="text-xs text-slate-500">
              Los campos se guardan temporalmente en este dispositivo. Las fotos
              deben volver a seleccionarse si la pagina se recarga.
            </p>
          </form>
        </div>
      </main>

      <FloatingNotice
        message={message}
        errorMessage={errorMessage}
        savedRecord={savedRecord}
      />
    </div>
  );
}

async function submitFsu03(form: Fsu03Input, files: EvidenciasFsu03Input) {
  const payload = new FormData();

  for (const [key, value] of Object.entries(form)) {
    payload.set(key, String(value ?? ""));
  }

  for (const [key, file] of Object.entries(files)) {
    if (file) {
      payload.set(key, file);
    }
  }

  const response = await fetch("/api/fsu-03", {
    method: "POST",
    body: payload,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible guardar el formulario.");
  }

  return result as Record<string, unknown>;
}
