"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

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
import { clearDraft, loadDraft, saveDraft } from "@/lib/drafts";
import {
  createFsu01Ingreso,
  type EvidenciasInput,
  type Fsu01Input,
  TIPO_OPERACION_OPTIONS,
  TIPO_VEHICULO_OPTIONS,
} from "@/lib/fsu01";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";

const DRAFT_KEY = "colfrutas-basc-fsu01-draft";

const initialForm: Fsu01Input = {
  fechaRegistro: "",
  horaRegistro: "",
  tipoOperacion: "",
  tipoOperacionOtro: "",
  placa: "",
  tipoVehiculo: "",
  empresaTransportadora: "",
  origen: "",
  destino: "",
  nombreConductor: "",
  numeroCedula: "",
  validacionVisualIngreso: null,
  autorizaIngreso: null,
  responsable: "",
  observaciones: "",
};

const initialFiles: EvidenciasInput = {
  fotoFrontalVehiculo: null,
  fotoPlaca: null,
  fotoParteTraseraPuertas: null,
  fotoInteriorUnidadCarga: null,
};

export function Fsu01Form() {
  const [form, setForm] = useState<Fsu01Input>(() =>
    loadDraft(DRAFT_KEY, initialForm),
  );
  const [files, setFiles] = useState(initialFiles);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    saveDraft(DRAFT_KEY, form);
  }, [form]);

  const normalizedPlate = normalizePlate(form.placa);
  const normalizedDate = normalizeOperationDate(form.fechaRegistro);
  const operationName =
    normalizedPlate && normalizedDate
      ? buildNombreOperacion(normalizedPlate, normalizedDate)
      : "";

  function setField(name: keyof Fsu01Input, value: string | boolean | null) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function setFile(name: keyof EvidenciasInput, file: File | null) {
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
        const data = await createFsu01Ingreso(form, files);
        setSavedRecord(data);
        setMessage(
          "F-SU-01 guardado correctamente. La operacion maestra quedo actualizada.",
        );
        setForm(initialForm);
        setFiles(initialFiles);
        clearDraft(DRAFT_KEY);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(180deg,_#f7faf8_0%,_#eef5f1_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-sky-800">
                Formulario real
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                F-SU-01 Ingreso de Vehiculos
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Captura el ingreso, crea o reutiliza la operacion maestra y sube
                las cuatro evidencias obligatorias a Supabase Storage.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Volver al inicio
            </Link>
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
              eyebrow="Datos del registro"
              title="Informacion principal del ingreso"
              tone="sky"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Fecha del registro"
                type="date"
                value={form.fechaRegistro}
                onChange={(value) => setField("fechaRegistro", value)}
                required
              />
              <InputField
                label="Hora del registro"
                type="time"
                value={form.horaRegistro}
                onChange={(value) => setField("horaRegistro", value)}
                required
              />
            </div>

            <SelectField
              label="Tipo de operacion"
              value={form.tipoOperacion}
              onChange={(value) => setField("tipoOperacion", value)}
              options={TIPO_OPERACION_OPTIONS}
              required
              tone="sky"
            />

            {form.tipoOperacion === "Otro" ? (
              <InputField
                label='Si seleccionaste "Otro", especifica'
                value={form.tipoOperacionOtro}
                onChange={(value) => setField("tipoOperacionOtro", value)}
                required
              />
            ) : null}

            <SectionTitle
              eyebrow="Datos del vehiculo"
              title="Unidad y ruta"
              tone="sky"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Placa del vehiculo"
                value={form.placa}
                onChange={(value) => setField("placa", value)}
                placeholder="Ej. BNL26F"
                required
              />
              <SelectField
                label="Tipo de vehiculo"
                value={form.tipoVehiculo}
                onChange={(value) => setField("tipoVehiculo", value)}
                options={TIPO_VEHICULO_OPTIONS}
                required
                tone="sky"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Empresa transportadora"
                value={form.empresaTransportadora}
                onChange={(value) => setField("empresaTransportadora", value)}
                required
              />
              <InputField
                label="Origen"
                value={form.origen}
                onChange={(value) => setField("origen", value)}
                required
              />
              <InputField
                label="Destino"
                value={form.destino}
                onChange={(value) => setField("destino", value)}
                required
              />
            </div>

            <SectionTitle
              eyebrow="Datos del conductor"
              title="Identificacion"
              tone="sky"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Nombre completo del conductor"
                value={form.nombreConductor}
                onChange={(value) => setField("nombreConductor", value)}
                required
              />
              <InputField
                label="Numero de cedula"
                value={form.numeroCedula}
                onChange={(value) => setField("numeroCedula", value)}
                required
              />
            </div>

            <SectionTitle
              eyebrow="Control de ingreso"
              title="Validacion y autorizacion"
              tone="sky"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <BooleanField
                label="Se realizo validacion visual del vehiculo al ingreso"
                value={form.validacionVisualIngreso}
                onChange={(value) => setField("validacionVisualIngreso", value)}
                tone="sky"
              />
              <BooleanField
                label="Se autoriza el ingreso del vehiculo"
                value={form.autorizaIngreso}
                onChange={(value) => setField("autorizaIngreso", value)}
                tone="sky"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Responsable"
                value={form.responsable}
                onChange={(value) => setField("responsable", value)}
                required
              />
              <TextAreaField
                label="Observaciones"
                value={form.observaciones}
                onChange={(value) => setField("observaciones", value)}
                tone="sky"
              />
            </div>

            <SectionTitle
              eyebrow="Evidencias"
              title="Carga fotografica obligatoria"
              tone="sky"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FileField
                label="Foto frontal del vehiculo"
                file={files.fotoFrontalVehiculo}
                onChange={(file) => setFile("fotoFrontalVehiculo", file)}
              />
              <FileField
                label="Foto de la placa"
                file={files.fotoPlaca}
                onChange={(file) => setFile("fotoPlaca", file)}
              />
              <FileField
                label="Foto de la parte trasera o puertas"
                file={files.fotoParteTraseraPuertas}
                onChange={(file) => setFile("fotoParteTraseraPuertas", file)}
              />
              <FileField
                label="Foto del interior de la unidad de carga"
                file={files.fotoInteriorUnidadCarga}
                onChange={(file) => setFile("fotoInteriorUnidadCarga", file)}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending ? "Guardando F-SU-01..." : "Guardar F-SU-01"}
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
