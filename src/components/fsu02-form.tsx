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
  CHECK_OPTIONS,
  type EvidenciasFsu02Input,
  type Fsu02Input,
  RESULTADO_INSPECCION_OPTIONS,
} from "@/lib/fsu02";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";

const initialForm: Fsu02Input = {
  fechaInspeccion: "",
  placa: "",
  numeroRemolqueContenedor: "",
  estadoGeneralExternoUnidad: "",
  estadoPuertas: "",
  estadoParedesLaterales: "",
  estadoPiso: "",
  estadoTecho: "",
  estadoSistemaCierre: "",
  ausenciaPerforacionesDaniosVisibles: "",
  ausenciaElementosExtranos: "",
  condicionEstructuralAptaParaCargue: "",
  limpiezaInternaUnidad: "",
  ausenciaResiduos: "",
  ausenciaOloresExtranos: "",
  ausenciaHumedadDerrame: "",
  ausenciaContaminacionVisible: "",
  condicionAptaParaProductoATransportar: "",
  resultadoFinalInspeccion: "",
  seAutorizaParaCargue: null,
  seDetectoNovedad: null,
  descripcionNovedad: "",
  responsableInspeccion: "",
};

const initialFiles: EvidenciasFsu02Input = {
  fotoLateralExternaUnidad: null,
  fotoInteriorVacioUnidadCarga: null,
  fotoPisoInterno: null,
  fotoTechoInterno: null,
  fotoPuertasSistemaCierre: null,
  fotoHallazgoNovedad: null,
};

const checkFields: Array<{ key: keyof Fsu02Input; label: string }> = [
  { key: "estadoGeneralExternoUnidad", label: "Estado general externo de la unidad" },
  { key: "estadoPuertas", label: "Estado de puertas" },
  { key: "estadoParedesLaterales", label: "Estado de paredes laterales" },
  { key: "estadoPiso", label: "Estado del piso" },
  { key: "estadoTecho", label: "Estado del techo" },
  { key: "estadoSistemaCierre", label: "Estado del sistema de cierre" },
  {
    key: "ausenciaPerforacionesDaniosVisibles",
    label: "Ausencia de perforaciones o danos visibles",
  },
  { key: "ausenciaElementosExtranos", label: "Ausencia de elementos extranos" },
  {
    key: "condicionEstructuralAptaParaCargue",
    label: "Condicion estructural apta para cargue",
  },
  { key: "limpiezaInternaUnidad", label: "Limpieza interna de la unidad" },
  { key: "ausenciaResiduos", label: "Ausencia de residuos" },
  { key: "ausenciaOloresExtranos", label: "Ausencia de olores extranos" },
  { key: "ausenciaHumedadDerrame", label: "Ausencia de humedad o derrames" },
  {
    key: "ausenciaContaminacionVisible",
    label: "Ausencia de contaminacion visible",
  },
  {
    key: "condicionAptaParaProductoATransportar",
    label: "Condicion apta para el producto a transportar",
  },
];

export function Fsu02Form() {
  const [form, setForm] = useState<Fsu02Input>(initialForm);
  const [files, setFiles] = useState(initialFiles);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<Record<string, unknown> | null>(
    null,
  );

  const normalizedPlate = normalizePlate(form.placa);
  const normalizedDate = normalizeOperationDate(form.fechaInspeccion);
  const operationName =
    normalizedPlate && normalizedDate
      ? buildNombreOperacion(normalizedPlate, normalizedDate)
      : "";

  function setField(name: keyof Fsu02Input, value: string | boolean | null) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function setFile(name: keyof EvidenciasFsu02Input, file: File | null) {
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
        const data = await submitFsu02(form, files);
        setSavedRecord(data);
        setMessage(
          "F-SU-02 guardado correctamente. La operacion maestra quedo actualizada.",
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,_#fcfaf5_0%,_#f7f3ea_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-amber-800">
                Formulario real
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                F-SU-02 Inspeccion Unidad de Carga
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Evalua el estado fisico e inocuidad de la unidad, sube evidencias y
                guarda la inspeccion en Supabase.
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
                href="/fsu-01"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Ver F-SU-01
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
              eyebrow="Datos base"
              title="Identificacion de la unidad"
              tone="amber"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Fecha de inspeccion"
                type="date"
                value={form.fechaInspeccion}
                onChange={(value) => setField("fechaInspeccion", value)}
                required
              />
              <InputField
                label="Placa del vehiculo"
                value={form.placa}
                onChange={(value) => setField("placa", value)}
                placeholder="Ej. BNL26F"
                required
              />
              <InputField
                label="Numero de remolque o contenedor"
                value={form.numeroRemolqueContenedor}
                onChange={(value) => setField("numeroRemolqueContenedor", value)}
                required
              />
            </div>

            <SectionTitle
              eyebrow="Condiciones fisicas"
              title="Revision estructural de la unidad"
              tone="amber"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {checkFields.slice(0, 9).map((field) => (
                <SelectField
                  key={field.key}
                  label={field.label}
                  value={form[field.key] as string}
                  onChange={(value) => setField(field.key, value)}
                  options={CHECK_OPTIONS}
                  required
                  tone="amber"
                />
              ))}
            </div>

            <SectionTitle
              eyebrow="Inocuidad"
              title="Condicion interna de la unidad"
              tone="amber"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {checkFields.slice(9).map((field) => (
                <SelectField
                  key={field.key}
                  label={field.label}
                  value={form[field.key] as string}
                  onChange={(value) => setField(field.key, value)}
                  options={CHECK_OPTIONS}
                  required
                  tone="amber"
                />
              ))}
            </div>

            <SectionTitle
              eyebrow="Resultado"
              title="Decision de inspeccion"
              tone="amber"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Resultado final de la inspeccion"
                value={form.resultadoFinalInspeccion}
                onChange={(value) => setField("resultadoFinalInspeccion", value)}
                options={RESULTADO_INSPECCION_OPTIONS}
                required
                tone="amber"
              />
              <InputField
                label="Responsable de la inspeccion"
                value={form.responsableInspeccion}
                onChange={(value) => setField("responsableInspeccion", value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <BooleanField
                label="Se autoriza para cargue"
                value={form.seAutorizaParaCargue}
                onChange={(value) => setField("seAutorizaParaCargue", value)}
                tone="amber"
              />
              <BooleanField
                label="Se detecto novedad"
                value={form.seDetectoNovedad}
                onChange={(value) => {
                  setField("seDetectoNovedad", value);
                  if (!value) {
                    setField("descripcionNovedad", "");
                    setFile("fotoHallazgoNovedad", null);
                  }
                }}
                tone="amber"
              />
            </div>

            {form.seDetectoNovedad ? (
              <TextAreaField
                label="Descripcion de la novedad"
                value={form.descripcionNovedad}
                onChange={(value) => setField("descripcionNovedad", value)}
                required
                tone="amber"
              />
            ) : (
              <TextAreaField
                label="Descripcion de la novedad"
                value="No aplica porque no se reporto novedad."
                onChange={() => undefined}
                disabled
                tone="amber"
              />
            )}

            <SectionTitle
              eyebrow="Evidencias"
              title="Carga fotografica obligatoria"
              tone="amber"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FileField
                label="Foto lateral externa de la unidad"
                file={files.fotoLateralExternaUnidad}
                onChange={(file) => setFile("fotoLateralExternaUnidad", file)}
              />
              <FileField
                label="Foto del interior vacio de la unidad de carga"
                file={files.fotoInteriorVacioUnidadCarga}
                onChange={(file) => setFile("fotoInteriorVacioUnidadCarga", file)}
              />
              <FileField
                label="Foto del piso interno"
                file={files.fotoPisoInterno}
                onChange={(file) => setFile("fotoPisoInterno", file)}
              />
              <FileField
                label="Foto del techo interno"
                file={files.fotoTechoInterno}
                onChange={(file) => setFile("fotoTechoInterno", file)}
              />
              <FileField
                label="Foto de puertas o sistema de cierre"
                file={files.fotoPuertasSistemaCierre}
                onChange={(file) => setFile("fotoPuertasSistemaCierre", file)}
              />
              <FileField
                label="Foto de hallazgo o novedad"
                file={files.fotoHallazgoNovedad}
                onChange={(file) => setFile("fotoHallazgoNovedad", file)}
                optional={!form.seDetectoNovedad}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? "Guardando F-SU-02..." : "Guardar F-SU-02"}
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

async function submitFsu02(form: Fsu02Input, files: EvidenciasFsu02Input) {
  const payload = new FormData();

  for (const [key, value] of Object.entries(form)) {
    payload.set(key, String(value ?? ""));
  }

  for (const [key, file] of Object.entries(files)) {
    if (file) {
      payload.set(key, file);
    }
  }

  const response = await fetch("/api/fsu-02", {
    method: "POST",
    body: payload,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible guardar el formulario.");
  }

  return result as Record<string, unknown>;
}
