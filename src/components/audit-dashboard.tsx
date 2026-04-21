"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { generateAuditPdf } from "@/lib/audit-report";
import {
  getOperacionAuditDetail,
  searchOperaciones,
  type AuditDetail,
  type AuditEvidence,
  type OperacionMaestraAudit,
} from "@/lib/audit";
import { formatEvidenceLabel, normalizeEvidenceUrl } from "@/lib/evidence";

export function AuditDashboard() {
  const [placa, setPlaca] = useState("");
  const [fecha, setFecha] = useState("");
  const [results, setResults] = useState<OperacionMaestraAudit[]>([]);
  const [selected, setSelected] = useState<AuditDetail | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<AuditEvidence | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSearchMessage(null);

    startTransition(async () => {
      try {
        const data = await searchOperaciones({ placa, fecha });
        setResults(data);
        setSelected(null);
        setSearchMessage(
          data.length > 0
            ? `${data.length} operacion(es) encontradas.`
            : "No se encontraron operaciones con ese filtro.",
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No fue posible consultar.",
        );
      }
    });
  }

  function handleLoadDetail(nombreOperacion: string) {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const detail = await getOperacionAuditDetail(nombreOperacion);
        setSelected(detail);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el detalle.",
        );
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#f7fbff_0%,_#eef5fb_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-sky-800">
                Auditoria BASC
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                Consulta de operaciones y evidencias
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Busca por placas o fechas y revisa en una sola vista el estado de la
                operacion, los formularios cargados y sus evidencias.
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

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <form
              onSubmit={handleSearch}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"
            >
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-sky-700">
                  Filtros
                </span>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Buscar operacion
                </h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field
                  label="Placa"
                  value={placa}
                  onChange={setPlaca}
                  placeholder="Ej. BNL26F"
                />
                <Field
                  label="Fecha"
                  type="date"
                  value={fecha}
                  onChange={setFecha}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPending ? "Consultando..." : "Buscar"}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPlaca("");
                  setFecha("");
                  setResults([]);
                  setSelected(null);
                  setSearchMessage(null);
                  setErrorMessage(null);
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Limpiar filtros
              </button>

              {searchMessage ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  {searchMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}
            </form>

            <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)]">
              <h3 className="text-xl font-semibold">Resultados</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Selecciona una operacion para ver el detalle consolidado.
              </p>

              <div className="mt-6 space-y-3">
                {results.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                    Sin resultados aun.
                  </div>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLoadDetail(item.nombre_operacion)}
                      className="flex w-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-left transition hover:border-sky-500 hover:bg-slate-900"
                    >
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                        {item.nombre_operacion}
                      </span>
                      <span className="mt-2 text-sm text-slate-100">
                        {item.placa} | {item.fecha}
                      </span>
                      <span className="mt-2 text-xs text-slate-400">
                        Ingreso: {formatEstado(item.estado_ingreso)} | Inspeccion:{" "}
                        {formatEstado(item.estado_inspeccion)} | Cargue:{" "}
                        {formatEstado(item.estado_cargue)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="space-y-6">
            <DetailCard
              detail={selected}
              onPreviewEvidence={setActiveEvidence}
              onGeneratePdf={async (detail) => {
                if (isGeneratingPdf) {
                  return;
                }

                setIsGeneratingPdf(true);
                try {
                  await generateAuditPdf(detail);
                } finally {
                  setIsGeneratingPdf(false);
                }
              }}
              isGeneratingPdf={isGeneratingPdf}
            />
          </section>
        </div>
      </main>

      {activeEvidence ? (
        <EvidenceModal
          item={activeEvidence}
          onClose={() => setActiveEvidence(null)}
        />
      ) : null}
    </div>
  );
}

function DetailCard({
  detail,
  onPreviewEvidence,
  onGeneratePdf,
  isGeneratingPdf,
}: {
  detail: AuditDetail | null;
  onPreviewEvidence: (item: AuditEvidence) => void;
  onGeneratePdf: (detail: AuditDetail) => Promise<void>;
  isGeneratingPdf: boolean;
}) {
  if (!detail) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Detalle de auditoria
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Selecciona una operacion para ver la informacion consolidada.
        </p>
      </section>
    );
  }

  const evidencias = collectEvidencias(detail);

  return (
    <>
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
          Operacion
        </span>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {detail.operacion.nombre_operacion}
        </h2>

        <div className="mt-4">
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={() => void onGeneratePdf(detail)}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGeneratingPdf ? "Generando PDF..." : "Descargar informe PDF"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DataChip label="Placa" value={detail.operacion.placa} />
          <DataChip label="Fecha" value={detail.operacion.fecha} />
          <DataChip
            label="Conductor"
            value={detail.operacion.conductor || "Sin dato"}
          />
          <DataChip
            label="Transportadora"
            value={detail.operacion.empresa_transportadora || "Sin dato"}
          />
          <DataChip
            label="Ruta evidencias"
            value={detail.operacion.ruta_evidencias_folder || "Sin dato"}
          />
          <DataChip
            label="Creada"
            value={detail.operacion.created_at || "Sin dato"}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StateBadge label="Ingreso" value={detail.operacion.estado_ingreso} />
          <StateBadge
            label="Inspeccion"
            value={detail.operacion.estado_inspeccion}
          />
          <StateBadge label="Cargue" value={detail.operacion.estado_cargue} />
          <StateBadge label="Salida" value={detail.operacion.estado_salida} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <FormStatusCard title="F-SU-01" record={detail.fsu01} />
        <FormStatusCard title="F-SU-02" record={detail.fsu02} />
        <FormStatusCard title="F-SU-03" record={detail.fsu03} />
      </section>

      <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)]">
        <h3 className="text-xl font-semibold">Evidencias detectadas</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Vista consolidada de fotos y soportes encontrados en los formularios.
        </p>

        {evidencias.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            No se detectaron URLs de evidencia.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {(["F-SU-01", "F-SU-02", "F-SU-03"] as const).map((group) => {
              const items = evidencias.filter((evidence) => evidence.group === group);

              if (items.length === 0) {
                return null;
              }

              return (
                <section key={group}>
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-sky-300">
                      {group}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {items.length} evidencia(s)
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <EvidenceCard
                        key={`${item.group}-${item.key}`}
                        item={item}
                        onPreview={() => onPreviewEvidence(item)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function collectEvidencias(detail: AuditDetail) {
  return [
    ...mapEvidenceGroup("F-SU-01", detail.fsu01),
    ...mapEvidenceGroup("F-SU-02", detail.fsu02),
    ...mapEvidenceGroup("F-SU-03", detail.fsu03),
  ];
}

function mapEvidenceGroup(
  group: AuditEvidence["group"],
  record: Record<string, unknown> | null,
) {
  if (!record) {
    return [];
  }

  return Object.entries(record)
    .filter(([key, value]) => key.endsWith("_url") && typeof value === "string" && value)
    .map(([key, value]) => ({
      group,
      key,
      label: formatEvidenceLabel(key),
      url: normalizeEvidenceUrl(value as string),
    }));
}

function FormStatusCard({
  title,
  record,
}: {
  title: string;
  record: Record<string, unknown> | null;
}) {
  const fields = buildSummaryFields(record);

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {record ? "Formulario encontrado." : "Formulario aun no registrado."}
      </p>

      <div className="mt-4 space-y-3">
        {!record ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Sin datos cargados por ahora.
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Sin campos resumibles.
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {field.label}
              </span>
              <p className="mt-2 break-words text-sm font-medium text-slate-900">
                {field.value}
              </p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function EvidenceCard({
  item,
  onPreview,
}: {
  item: AuditEvidence;
  onPreview: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/70 text-sm transition hover:border-sky-500">
      <button type="button" onClick={onPreview} className="block w-full text-left">
        <div className="relative flex h-48 w-full items-center justify-center bg-slate-950">
          {!failed ? (
            <img
              src={item.url}
              alt={item.label}
              className="h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                Vista previa no disponible
              </span>
              <p className="text-sm text-slate-300">
                La imagen no pudo cargarse. Revisa la URL o permisos del bucket.
              </p>
            </div>
          )}
        </div>
        <div className="px-4 py-4">
          <span className="block text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
            {item.group}
          </span>
          <span className="mt-2 block text-sm font-medium text-slate-100">
            {item.label}
          </span>
          <span className="mt-2 block text-xs text-slate-400">Ver imagen</span>
        </div>
      </button>
    </article>
  );
}

function EvidenceModal({
  item,
  onClose,
}: {
  item: AuditEvidence;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
              {item.group}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 flex min-h-[420px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-950">
          {!failed ? (
            <img
              src={item.url}
              alt={item.label}
              className="max-h-[70vh] w-auto max-w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="px-8 text-center text-slate-300">
              <p className="text-lg font-semibold">No se pudo cargar la imagen.</p>
              <p className="mt-3 break-words text-sm">{item.url}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSummaryFields(record: Record<string, unknown> | null) {
  if (!record) {
    return [];
  }

  const blockedKeys = new Set([
    "id",
    "created_at",
    "updated_at",
    "nombre_operacion",
    "placa",
  ]);

  return Object.entries(record)
    .filter(([key, value]) => !blockedKeys.has(key) && !key.endsWith("_url") && value !== null)
    .slice(0, 6)
    .map(([key, value]) => ({
      label: humanizeFieldLabel(key),
      value: formatSummaryValue(value),
    }));
}

function humanizeFieldLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatSummaryValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return String(value);
}

function formatEstado(value: string) {
  return value.replaceAll("_", " ");
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
      />
    </label>
  );
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StateBadge({ label, value }: { label: string; value: string }) {
  const tone =
    value === "completo"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "en_proceso"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <span className="block text-xs font-bold uppercase tracking-[0.2em]">{label}</span>
      <p className="mt-2 text-sm font-semibold">{formatEstado(value)}</p>
    </div>
  );
}
