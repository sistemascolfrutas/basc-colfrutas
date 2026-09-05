"use client";

import { useEffect, useState } from "react";

import type {
  OperacionMaestraRecord,
  PendingOperacionForm,
} from "@/lib/operaciones-maestra";

type PendingOperationPickerProps = {
  form: PendingOperacionForm;
  label: string;
  refreshKey?: number;
  onSelect: (operacion: OperacionMaestraRecord) => void;
};

export function PendingOperationPicker({
  form,
  label,
  refreshKey = 0,
  onSelect,
}: PendingOperationPickerProps) {
  const [operaciones, setOperaciones] = useState<OperacionMaestraRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      setIsLoading(true);
      setSelected("");
      setOperaciones([]);
      setErrorMessage(null);

      try {
        const data = await loadPendingOperaciones(form);
        if (active) {
          setOperaciones(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No fue posible cargar operaciones pendientes.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [form, refreshKey]);

  function handleSelect(value: string) {
    setSelected(value);
    const operacion = operaciones.find(
      (item) => item.nombre_operacion === value,
    );

    if (operacion) {
      onSelect(operacion);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Operaciones pendientes
        </span>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          {label}
          <select
            value={selected}
            disabled={isLoading || operaciones.length === 0}
            onChange={(event) => handleSelect(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">
              {isLoading
                ? "Cargando operaciones..."
                : errorMessage
                  ? "No fue posible consultar los pendientes. Recarga la página."
                : operaciones.length > 0
                  ? "Selecciona una operacion o escribe manualmente abajo"
                  : "No hay operaciones pendientes para este formulario"}
            </option>
            {operaciones.map((operacion) => (
              <option
                key={operacion.nombre_operacion}
                value={operacion.nombre_operacion}
              >
                {operacion.nombre_operacion} -{" "}
                {operacion.conductor || "Sin conductor"}
              </option>
            ))}
          </select>
        </label>
        {errorMessage ? (
          <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
        ) : (
          <p className="text-xs text-slate-500">
            Se muestran operaciones abiertas que cumplen las etapas anteriores
            y tienen pendiente este formulario.
          </p>
        )}
      </div>
    </section>
  );
}

async function loadPendingOperaciones(form: PendingOperacionForm) {
  const response = await fetch(`/api/operaciones-pendientes?form=${form}`, {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "No fue posible cargar operaciones pendientes.",
    );
  }

  return result as OperacionMaestraRecord[];
}
