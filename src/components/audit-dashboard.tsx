"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { generateAuditPdf } from "@/lib/audit-report";
import { AuditPrecintosSection } from "@/components/audit-precintos-section";
import {
  type AuditDetail,
  type AuditEvidence,
  type OperacionMaestraAudit,
} from "@/lib/audit";
import { formatEvidenceLabel, normalizeEvidenceUrl } from "@/lib/evidence";
import { TIPO_OPERACION_OPTIONS } from "@/lib/fsu01";

const TIPO_OPERACION_CONTINUA_FLUJO = "Transporte de acopio a puerto";

export function AuditDashboard() {
  const [placa, setPlaca] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState("");
  const [results, setResults] = useState<OperacionMaestraAudit[]>([]);
  const [selected, setSelected] = useState<AuditDetail | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<AuditEvidence | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    let active = true;

    startTransition(async () => {
      try {
        const data = await searchOperacionesRequest({});
        if (!active) {
          return;
        }

        setResults(data);
        setSearchMessage(
          data.length > 0
            ? `${data.length} operacion(es) cargadas.`
            : "No hay operaciones registradas.",
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "No fue posible consultar.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSearchMessage(null);

    startTransition(async () => {
      try {
        const data = await searchOperacionesRequest({
          placa,
          fecha,
          tipoOperacion,
        });
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
        const detail = await getOperacionAuditDetailRequest(nombreOperacion);
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
                Busca por placa o fecha y revisa en una sola vista el estado de la
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

        <section className="space-y-6">
          <form
            onSubmit={handleSearch}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-sky-700">
                  Filtros
                </span>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Buscar operacion
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
              <Field
                label="Placa"
                value={placa}
                onChange={setPlaca}
                placeholder="Ej. BNL26F"
              />
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Tipo de operacion
                <select
                  value={tipoOperacion}
                  onChange={(event) => setTipoOperacion(event.target.value)}
                  className="min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                >
                  <option value="">Todos los tipos</option>
                  {TIPO_OPERACION_OPTIONS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Fecha"
                type="date"
                value={fecha}
                onChange={setFecha}
              />

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-950 px-8 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPending ? "Consultando..." : "Buscar"}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setPlaca("");
                  setFecha("");
                  setTipoOperacion("");
                  setSelected(null);
                  setSearchMessage(null);
                  setErrorMessage(null);
                  startTransition(async () => {
                    try {
                      const data = await searchOperacionesRequest({});
                      setResults(data);
                      setSearchMessage(
                        data.length > 0
                          ? `${data.length} operacion(es) cargadas.`
                          : "No hay operaciones registradas.",
                      );
                    } catch (error) {
                      setErrorMessage(
                        error instanceof Error
                          ? error.message
                          : "No fue posible consultar.",
                      );
                    }
                  });
                }}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Limpiar filtros
              </button>
            </div>

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

          <ResultsTable
            results={results}
            selectedNombreOperacion={selected?.operacion.nombre_operacion ?? null}
            isPending={isPending}
            onSelect={handleLoadDetail}
          />

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

          <AuditPrecintosSection />
        </section>
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

async function searchOperacionesRequest(filters: {
  placa?: string;
  fecha?: string;
  tipoOperacion?: string;
}) {
  const response = await fetch("/api/audit/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible consultar.");
  }

  return result as OperacionMaestraAudit[];
}

async function getOperacionAuditDetailRequest(nombreOperacion: string) {
  const response = await fetch(
    `/api/audit/${encodeURIComponent(nombreOperacion)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible cargar el detalle.");
  }

  return result as AuditDetail;
}

function ResultsTable({
  results,
  selectedNombreOperacion,
  isPending,
  onSelect,
}: {
  results: OperacionMaestraAudit[];
  selectedNombreOperacion: string | null;
  isPending: boolean;
  onSelect: (nombreOperacion: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">
            Informacion ingresada
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Selecciona una fila para ver formularios y evidencias.
          </p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
          {results.length} registro(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Operacion</th>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Conductor</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  {isPending ? "Cargando informacion..." : "Sin registros para mostrar."}
                </td>
              </tr>
            ) : (
              results.map((item) => {
                const isSelected =
                  item.nombre_operacion === selectedNombreOperacion;

                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition hover:bg-sky-50/70 ${
                      isSelected ? "bg-sky-50" : "bg-white"
                    }`}
                    onClick={() => onSelect(item.nombre_operacion)}
                  >
                    <td className="max-w-[220px] px-4 py-4">
                      <button
                        type="button"
                        className="text-left text-xs font-bold uppercase tracking-[0.12em] text-sky-700 underline-offset-4 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(item.nombre_operacion);
                        }}
                      >
                        {item.nombre_operacion}
                      </button>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {item.placa}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{item.fecha}</td>
                    <td className="px-4 py-4 text-slate-700">
                      {item.conductor || "Sin dato"}
                    </td>
                    <td className="px-4 py-4">
                      <InlineState value={getOverallState(item)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
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
  const [activeForm, setActiveForm] = useState<AuditEvidence["group"]>("F-SU-01");

  if (!detail) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Formularios de la operacion
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Selecciona una operacion para ver la informacion consolidada.
        </p>
      </section>
    );
  }

  const evidencias = collectEvidencias(detail);
  const activeEvidenceItems = evidencias.filter(
    (evidence) => evidence.group === activeForm,
  );
  const activeFormDoesNotApply =
    !requiresInspectionAndLoading(detail) &&
    (activeForm === "F-SU-02" || activeForm === "F-SU-03");

  return (
    <>
      <FormTabs
        activeForm={activeForm}
        detail={detail}
        onChange={setActiveForm}
        onGeneratePdf={onGeneratePdf}
        isGeneratingPdf={isGeneratingPdf}
      />

      <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-100 shadow-[0_25px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Evidencias</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Soportes fotográficos asociados al formulario seleccionado.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
            {activeForm}
          </span>
        </div>

        {activeFormDoesNotApply ? (
          <div className="mt-6 rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            No aplica para este tipo de operacion.
          </div>
        ) : activeEvidenceItems.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            No se detectaron evidencias para este formulario.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeEvidenceItems.map((item) => (
              <EvidenceCard
                key={`${item.group}-${item.key}`}
                item={item}
                onPreview={() => onPreviewEvidence(item)}
              />
            ))}
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
    ...mapEvidenceGroup("SELLADO", detail.supervision),
    ...mapEvidenceGroup("F-SU-04", detail.fsu04),
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

function FormTabs({
  activeForm,
  detail,
  onChange,
  onGeneratePdf,
  isGeneratingPdf,
}: {
  activeForm: AuditEvidence["group"];
  detail: AuditDetail;
  onChange: (form: AuditEvidence["group"]) => void;
  onGeneratePdf: (detail: AuditDetail) => Promise<void>;
  isGeneratingPdf: boolean;
}) {
  const forms: Array<{
    key: AuditEvidence["group"];
    title: string;
    record: Record<string, unknown> | null;
  }> = [
    { key: "F-SU-01", title: "Ingreso", record: detail.fsu01 },
    { key: "F-SU-02", title: "Inspeccion", record: detail.fsu02 },
    { key: "F-SU-03", title: "Cargue", record: detail.fsu03 },
    { key: "SELLADO", title: "Supervisión de sellado", record: detail.supervision },
    { key: "F-SU-04", title: "Salida", record: detail.fsu04 },
  ];
  const current = forms.find((form) => form.key === activeForm) ?? forms[0];
  const fields = buildSummaryFields(current.record);
  const isNotApplicable =
    !requiresInspectionAndLoading(detail) &&
    (current.key === "F-SU-02" || current.key === "F-SU-03");

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
      <div className="border-b border-slate-200 px-6 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="pb-4">
            <h3 className="text-xl font-semibold text-slate-950">
              Formularios de la operacion
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {detail.operacion.nombre_operacion}
            </p>
          </div>
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={() => void onGeneratePdf(detail)}
            className="mb-3 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGeneratingPdf ? "Generando PDF..." : "Descargar informe PDF"}
          </button>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-3">
            {forms.map((form) => {
              const isActive = form.key === activeForm;

              return (
                <button
                  key={form.key}
                  type="button"
                  onClick={() => onChange(form.key)}
                  className={`min-w-[112px] rounded-t-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                  }`}
                >
                  <span className="block text-xs font-bold uppercase tracking-[0.18em]">
                    {form.key}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">
                    {form.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        {isNotApplicable ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm font-semibold text-slate-700">
            No aplica para este tipo de operacion.
          </div>
        ) : !current.record ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Sin datos cargados por ahora.
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Sin campos resumibles.
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full table-fixed border-collapse text-sm">
              <tbody className="divide-y divide-slate-100">
                {fields.map((field) => (
                  <tr key={field.label} className="align-top">
                    <th className="w-[34%] break-words bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      {field.label}
                    </th>
                    <td className="break-words px-4 py-3 font-medium leading-6 text-slate-900">
                      {field.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
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
    "user_id",
    "auth_user_id",
    "created_at",
    "updated_at",
    "nombre_operacion",
    "placa",
    "origen",
    "destino",
  ]);

  const normalizedRecord = normalizeRecordForDisplay(record);

  return Object.entries(normalizedRecord)
    .filter(([key, value]) => !blockedKeys.has(key) && !key.endsWith("_url") && value !== null)
    .map(([key, value]) => ({
      label: humanizeFieldLabel(key),
      value: formatSummaryValue(value),
    }));
}

function normalizeRecordForDisplay(record: Record<string, unknown>) {
  const normalized = { ...record };
  const driverIdentity = normalizeDriverIdentity(
    formatRawValue(record.nombre_conductor),
    formatRawValue(record.numero_cedula),
  );

  if (driverIdentity.wasSwapped) {
    normalized.nombre_conductor = driverIdentity.name;
    normalized.numero_cedula = driverIdentity.document;
  }

  return normalized;
}

function normalizeDriverIdentity(name: string, document: string) {
  const shouldSwap = looksLikeDocument(name) && looksLikePersonName(document);

  return {
    name: shouldSwap ? document : name,
    document: shouldSwap ? name : document,
    wasSwapped: shouldSwap,
  };
}

function looksLikeDocument(value: string) {
  const compact = value.replace(/\D/g, "");
  return compact.length >= 5 && compact.length >= value.trim().length * 0.65;
}

function looksLikePersonName(value: string) {
  return /[a-záéíóúñü]/i.test(value) && !looksLikeDocument(value);
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

function formatRawValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function formatEstado(value: string) {
  return value.replaceAll("_", " ");
}

function getOverallState(item: OperacionMaestraAudit) {
  return item.estado_salida === "completo" ? "completada" : "pendiente";
}

function requiresInspectionAndLoading(detail: AuditDetail) {
  return (
    formatRawValue(detail.fsu01?.tipo_operacion) === TIPO_OPERACION_CONTINUA_FLUJO
  );
}

function InlineState({ value }: { value: string }) {
  const tone =
    value === "completo" || value === "completada"
      ? "bg-emerald-50 text-emerald-700"
      : value === "en_proceso"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {formatEstado(value)}
    </span>
  );
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
