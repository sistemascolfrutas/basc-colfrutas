"use client";

import { useMemo, useState, useTransition } from "react";

import { getOrCreateOperacionMaestra } from "@/lib/operaciones-maestra";
import { buildNombreOperacion, normalizeOperationDate, normalizePlate } from "@/lib/operations";

type OperacionResultado = {
  id: string;
  nombre_operacion: string;
  placa: string;
  fecha: string;
  conductor: string | null;
  empresa_transportadora: string | null;
  estado_ingreso: string;
  estado_inspeccion: string;
  estado_cargue: string;
  estado_salida: string;
  ruta_evidencias_folder: string | null;
};

const initialForm = {
  placa: "",
  fecha: "",
  conductor: "",
  empresaTransportadora: "",
};

export function OperacionMaestraTester() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<OperacionResultado | null>(null);
  const [isPending, startTransition] = useTransition();

  const nombreOperacionPreview = useMemo(() => {
    const placa = normalizePlate(form.placa);
    const fecha = normalizeOperationDate(form.fecha);

    if (!placa || !fecha) {
      return "";
    }

    return buildNombreOperacion(placa, fecha);
  }, [form.fecha, form.placa]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await getOrCreateOperacionMaestra(form);

        setResult(response.data);
        setMessage(
          response.created
            ? "Operacion creada correctamente en Supabase."
            : "La operacion ya existia y fue recuperada desde Supabase.",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado al conectar con Supabase.";

        setErrorMessage(message);
      }
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">
            Prueba de conexion
          </span>
          <h2 className="text-2xl font-semibold text-slate-950">
            Operacion maestra
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Este formulario valida la conexion con Supabase y la regla de
            negocio de `nombre_operacion`.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field
            label="Placa"
            placeholder="Ej. BNL 26F"
            value={form.placa}
            onChange={(value) => updateField("placa", value)}
          />

          <Field
            label="Fecha"
            placeholder="Ej. 2026-04-16"
            value={form.fecha}
            onChange={(value) => updateField("fecha", value)}
          />

          <Field
            label="Conductor"
            placeholder="Nombre del conductor"
            value={form.conductor}
            onChange={(value) => updateField("conductor", value)}
          />

          <Field
            label="Empresa transportadora"
            placeholder="Nombre de la empresa"
            value={form.empresaTransportadora}
            onChange={(value) => updateField("empresaTransportadora", value)}
          />

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <span className="block text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
              NombreOperacion
            </span>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">
              {nombreOperacionPreview || "Completa placa y fecha para previsualizar"}
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Procesando..." : "Consultar o crear operacion"}
          </button>
        </form>
      </div>

      <div className="rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)] md:p-8">
        <h3 className="text-xl font-semibold">Resultado</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Si la tabla y las credenciales quedaron bien, aqui veras el registro
          real devuelto por Supabase.
        </p>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl bg-slate-900/80 p-4">
          <pre className="overflow-x-auto text-xs leading-6 text-slate-200">
            {result ? JSON.stringify(result, null, 2) : "Sin datos aun."}
          </pre>
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, placeholder, value, onChange }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}
