import { InputField, SelectField } from "@/components/form-ui";

export type SavedSelladoEvent = {
  id: string;
  tipo_evento: string;
  created_at: string;
  precintos: { tipo: string; numero: string; foto_url: string }[];
  instalador_id: string | null;
  instalador_nombre: string;
  instalador_cedula: string;
  supervisor_id: string | null;
  supervisor_nombre: string;
  supervisor_cedula: string;
  firma_instalador_url: string;
  firma_supervisor_url: string;
  observaciones: string | null;
};

const unchanged = () => {};

export function SavedSelladoEventCard({ event, index }: { event: SavedSelladoEvent; index: number }) {
  return (
    <section className="space-y-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="font-semibold">Registro {index + 1} · {event.tipo_evento === "stand_by" ? "STAND BY" : "Definitivo"} · Bloqueado</h2>
        <p className="mt-1 text-sm text-slate-600">{new Date(event.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}. Los datos, fotos y firmas guardados no se pueden modificar.</p>
      </div>
      <SelectField label="Cantidad de precintos guardados" value={String(event.precintos.length)} options={[String(event.precintos.length)]} onChange={unchanged} disabled tone="sky" />
      <div className="grid gap-5 md:grid-cols-2">
        {event.precintos.map((seal, i) => (
          <div key={`${event.id}-${i}`} className="space-y-3 rounded-2xl bg-white p-4">
            <SelectField label={`Tipo de precinto ${i + 1}`} value={seal.tipo} options={[{ value: seal.tipo, label: seal.tipo === "correa" ? "Precinto de correa" : "Precinto de botella" }]} onChange={unchanged} disabled tone="sky" />
            <InputField label="Número del precinto" value={seal.numero} onChange={unchanged} disabled />
            <SavedImage url={seal.foto_url} label={`Foto del precinto ${seal.numero}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <SelectField label="Quién instala (COLFRUTAS)" value={event.instalador_id || "guardado"} options={[{ value: event.instalador_id || "guardado", label: event.instalador_nombre }]} onChange={unchanged} disabled tone="sky" />
          <InputField label="Cédula de quien instala" value={event.instalador_cedula} onChange={unchanged} disabled />
          <SavedImage url={event.firma_instalador_url} label="Firma de quien instala" />
        </div>
        <div className="space-y-3">
          <SelectField label="Quién supervisa (ATEMPI)" value={event.supervisor_id || "guardado"} options={[{ value: event.supervisor_id || "guardado", label: event.supervisor_nombre }]} onChange={unchanged} disabled tone="sky" />
          <InputField label="Cédula de quien supervisa" value={event.supervisor_cedula} onChange={unchanged} disabled />
          <SavedImage url={event.firma_supervisor_url} label="Firma de quien supervisa" />
        </div>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium">Observaciones guardadas
        <textarea value={event.observaciones ?? ""} readOnly rows={3} className="rounded-2xl border bg-white px-4 py-3" />
      </label>
    </section>
  );
}

function SavedImage({ url, label }: { url: string; label: string }) {
  return <figure className="space-y-2">
    <figcaption className="text-sm font-medium">{label} · Solo lectura</figcaption>
    {url ? <a href={url} target="_blank" rel="noreferrer">
      {/* Signed private evidence is displayed directly without the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="max-h-64 w-full rounded-xl border bg-white object-contain" />
    </a> : <p className="text-sm text-rose-700">No hay evidencia disponible.</p>}
  </figure>;
}
