"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  FileField,
  FloatingNotice,
  InputField,
  SectionTitle,
  SelectField,
  TextAreaField,
} from "@/components/form-ui";
import { PendingOperationPicker } from "@/components/pending-operation-picker";
import {
  clearBrowserDraft,
  loadBrowserDraft,
  saveBrowserDraft,
} from "@/lib/browser-drafts";
import {
  type EvidenciasFsu04Input,
  type Fsu04Input,
  PUERTAS_SELLOS_OPTIONS,
} from "@/lib/fsu04";

const DRAFT_KEY = "fsu04-form-draft";

const initialForm: Fsu04Input = {
  nombreOperacion: "",
  tipoOperacion: "",
  fechaHoraSalida: "",
  placaNumeroContenedor: "",
  puertasCerradasSellosInstalados: "",
  precintoSeguridad: "",
  precintoCorrea: "",
  observaciones: "",
};

const initialFiles: EvidenciasFsu04Input = {
  fotoFinalUnidadSalida: null,
  fotoPrecintoCorrea: null,
  fotoPrecintoBotella: null,
  fotoOtroPrecinto: null,
};

export function Fsu04Form() {
  const [form, setForm] = useState<Fsu04Input>(initialForm);
  const [files, setFiles] = useState(initialFiles);
  const formRef = useRef(form);
  const filesRef = useRef(files);
  const [isPending, startTransition] = useTransition();
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRefresh, setPendingRefresh] = useState(0);
  const [savedRecord, setSavedRecord] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const draft = await loadBrowserDraft<Fsu04Input, EvidenciasFsu04Input>(
          DRAFT_KEY,
        );

        if (active && draft) {
          const draftForm = { ...initialForm, ...draft.form };
          const draftFiles = { ...initialFiles, ...draft.files };

          formRef.current = draftForm;
          filesRef.current = draftFiles;
          setForm(draftForm);
          setFiles(draftFiles);
          setMessage("Se recupero un borrador local de F-SU-04.");
          window.setTimeout(() => {
            setMessage((current) =>
              current === "Se recupero un borrador local de F-SU-04."
                ? null
                : current,
            );
          }, 3500);
        }
      } catch {
        if (active) {
          setErrorMessage("No fue posible recuperar el borrador local de F-SU-04.");
        }
      } finally {
        if (active) {
          setIsDraftReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!hasDraftContent(form, files)) {
        void clearBrowserDraft(DRAFT_KEY);
        return;
      }

      void saveBrowserDraft(DRAFT_KEY, {
        form,
        files,
        updatedAt: new Date().toISOString(),
      }).catch(() => {
        setErrorMessage(
          "No fue posible guardar temporalmente el borrador en este navegador.",
        );
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [files, form, isDraftReady]);

  function setField(name: keyof Fsu04Input, value: string) {
    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      };

      formRef.current = nextForm;
      return nextForm;
    });
  }

  function setFile(name: keyof EvidenciasFsu04Input, file: File | null) {
    const nextFiles = {
      ...filesRef.current,
      [name]: file,
    };

    filesRef.current = nextFiles;
    setFiles(nextFiles);

    void persistDraftNow(formRef.current, nextFiles);
  }

  async function persistDraftNow(
    nextForm: Fsu04Input,
    nextFiles: EvidenciasFsu04Input,
  ) {
    if (!isDraftReady) {
      return;
    }

    try {
      if (!hasDraftContent(nextForm, nextFiles)) {
        await clearBrowserDraft(DRAFT_KEY);
        return;
      }

      await saveBrowserDraft(DRAFT_KEY, {
        form: nextForm,
        files: nextFiles,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setErrorMessage(
        "No fue posible guardar temporalmente la foto en este navegador.",
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setSavedRecord(null);

    startTransition(async () => {
      try {
        const data = await submitFsu04(form, files);
        setSavedRecord(data);
        setPendingRefresh((value) => value + 1);
        setMessage(
          "F-SU-04 guardado correctamente. La salida de la operacion quedo completa.",
        );
        setForm(initialForm);
        setFiles(initialFiles);
        formRef.current = initialForm;
        filesRef.current = initialFiles;
        await clearBrowserDraft(DRAFT_KEY);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(180deg,_#fff9ed_0%,_#f7f5ee_55%,_#f8fafc_100%)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.28em] text-amber-800">
                Formulario real
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                F-SU-04 Control de Salida
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Registra la salida de la unidad de carga y la evidencia final de
                puertas y sellos.
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
                href="/fsu-03"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Ver F-SU-03
              </Link>
            </div>
          </div>
        </header>

        <PendingOperationPicker
          refreshKey={pendingRefresh}
          form="fsu04"
          label="Seleccionar placa pendiente de salida"
          onSelect={(operacion) =>
            setForm((current) => {
              const nextForm = {
                ...current,
                nombreOperacion: operacion.nombre_operacion,
                tipoOperacion: operacion.tipo_operacion ?? "",
                fechaHoraSalida: getCurrentDateTimeForInput(),
                placaNumeroContenedor: operacion.placa,
              };

              formRef.current = nextForm;
              return nextForm;
            })
          }
        />

        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] md:p-8"
        >
          <SectionTitle
            eyebrow="Salida de unidad"
            title="Datos de cierre de la operacion"
            tone="amber"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Fecha y hora de salida de la unidad"
              type="datetime-local"
              value={form.fechaHoraSalida}
              onChange={(value) => setField("fechaHoraSalida", value)}
              required
            />
            <InputField
              label="Placa del vehiculo / numero de contenedor"
              value={form.placaNumeroContenedor}
              onChange={(value) => setField("placaNumeroContenedor", value)}
              placeholder="Ej. BNL26F"
              required
            />
          </div>

          <SelectField
            label="La unidad sale con puertas cerradas y sellos instalados segun lo registrado"
            value={form.puertasCerradasSellosInstalados}
            onChange={(value) =>
              setField("puertasCerradasSellosInstalados", value)
            }
            options={PUERTAS_SELLOS_OPTIONS}
            required
            tone="amber"
          />

          {form.tipoOperacion === "Transporte de acopio a puerto" ? (
            <InputField
              label="Precinto de botella"
              value={form.precintoSeguridad}
              onChange={(value) => setField("precintoSeguridad", value)}
              placeholder="Ingresa el numero o identificacion del precinto"
              required
            />
          ) : null}

          {form.tipoOperacion === "Transporte de acopio a puerto" ? (
            <InputField
              label="Precinto de correa"
              value={form.precintoCorrea}
              onChange={(value) => setField("precintoCorrea", value)}
              placeholder="Ingresa el número del precinto de correa"
            />
          ) : null}

          <TextAreaField
            label="Observaciones"
            value={form.observaciones}
            onChange={(value) => setField("observaciones", value)}
            placeholder="Registra novedades u observaciones de salida"
            tone="amber"
          />

          <SectionTitle
            eyebrow="Evidencia final"
            title="Soporte fotografico de salida"
            tone="amber"
          />

          <FileField
            label="Foto final de la unidad al momento de la salida"
            file={files.fotoFinalUnidadSalida}
            onChange={(file) => setFile("fotoFinalUnidadSalida", file)}
            sourceOptions
          />

          {form.tipoOperacion === "Transporte de acopio a puerto" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <FileField
                label="1. Precinto de correa"
                file={files.fotoPrecintoCorrea}
                onChange={(file) => setFile("fotoPrecintoCorrea", file)}
                sourceOptions
              />
              <FileField
                label="2. Precinto de botella"
                file={files.fotoPrecintoBotella}
                onChange={(file) => setFile("fotoPrecintoBotella", file)}
                sourceOptions
              />
              <FileField
                label="3. Otro precinto (opcional)"
                file={files.fotoOtroPrecinto}
                onChange={(file) => setFile("fotoOtroPrecinto", file)}
                sourceOptions
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Guardando F-SU-04..." : "Guardar F-SU-04"}
          </button>
        </form>
      </main>

      <FloatingNotice
        message={message}
        errorMessage={errorMessage}
        savedRecord={savedRecord}
      />
    </div>
  );
}

function getCurrentDateTimeForInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
async function submitFsu04(form: Fsu04Input, files: EvidenciasFsu04Input) {
  const payload = new FormData();

  for (const [key, value] of Object.entries(form)) {
    payload.set(key, String(value ?? ""));
  }

  for (const [key, file] of Object.entries(files)) {
    if (file) {
      payload.set(key, file);
    }
  }

  const response = await fetch("/api/fsu-04", {
    method: "POST",
    body: payload,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No fue posible guardar el formulario.");
  }

  return result as Record<string, unknown>;
}

function hasDraftContent(form: Fsu04Input, files: EvidenciasFsu04Input) {
  return (
    Object.values(form).some((value) => value !== "" && value !== null) ||
    Object.values(files).some(Boolean)
  );
}
