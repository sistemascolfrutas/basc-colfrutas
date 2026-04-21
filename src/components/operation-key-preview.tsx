"use client";

import { useMemo, useState } from "react";

import {
  buildEvidenciasFolderPath,
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";

export function OperationKeyPreview() {
  const [placa, setPlaca] = useState("");
  const [fecha, setFecha] = useState("");

  const placaNormalizada = useMemo(() => normalizePlate(placa), [placa]);
  const fechaNormalizada = useMemo(() => normalizeOperationDate(fecha), [fecha]);
  const nombreOperacion = useMemo(() => {
    if (!placaNormalizada || !fechaNormalizada) {
      return "";
    }

    return buildNombreOperacion(placaNormalizada, fechaNormalizada);
  }, [fechaNormalizada, placaNormalizada]);

  const folder = nombreOperacion
    ? buildEvidenciasFolderPath(nombreOperacion)
    : "";

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Llave natural
        </span>
        <h2 className="text-2xl font-semibold text-slate-900">
          Previsualiza la operación antes de guardar
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Esta pantalla deja lista la regla crítica del proyecto: una operación
          se identifica con la placa normalizada y la fecha limpia.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Placa
          <input
            value={placa}
            onChange={(event) => setPlaca(event.target.value)}
            placeholder="Ej. bnl 26f"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Fecha
          <input
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            placeholder="Ej. 2026-04-16"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <PreviewCard label="Placa limpia" value={placaNormalizada || "Sin valor"} />
        <PreviewCard label="Fecha limpia" value={fechaNormalizada || "Sin valor"} />
        <PreviewCard
          label="NombreOperacion"
          value={nombreOperacion || "Completa placa y fecha"}
          highlight
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-sm text-slate-100">
        <span className="block text-xs uppercase tracking-[0.24em] text-emerald-300">
          Ruta sugerida de evidencias
        </span>
        <code className="mt-2 block overflow-x-auto text-sm">
          {folder || "evidencias/PLACA_FECHA"}
        </code>
      </div>
    </section>
  );
}

type PreviewCardProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function PreviewCard({ label, value, highlight = false }: PreviewCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <p className="mt-2 break-all text-base font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}
