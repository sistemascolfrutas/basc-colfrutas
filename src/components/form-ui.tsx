"use client";

type SectionTitleProps = {
  eyebrow: string;
  title: string;
  tone: "sky" | "amber" | "rose";
};

type FloatingNoticeProps = {
  message: string | null;
  errorMessage: string | null;
  savedRecord: Record<string, unknown> | null;
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  required?: boolean;
  disabled?: boolean;
  tone: "sky" | "amber" | "rose";
};

type BooleanFieldProps = {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  tone: "sky" | "amber" | "rose";
};

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  tone: "sky" | "amber" | "rose";
};

type FileFieldProps = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  optional?: boolean;
  disabled?: boolean;
};

type OperationPreviewCardProps = {
  placa: string;
  fecha: string;
  operationName: string;
};

const TONE_CLASS = {
  sky: "focus:border-sky-500",
  amber: "focus:border-amber-500",
  rose: "focus:border-rose-500",
};

const TONE_BG_CLASS = {
  sky: "border-sky-700 bg-sky-700",
  amber: "border-amber-600 bg-amber-600",
  rose: "border-rose-700 bg-rose-700",
};

const TONE_TEXT_CLASS = {
  sky: "text-sky-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

export function SectionTitle({ eyebrow, title, tone }: SectionTitleProps) {
  return (
    <div className="border-b border-slate-200 pb-4">
      <span
        className={[
          "text-xs font-bold uppercase tracking-[0.25em]",
          TONE_TEXT_CLASS[tone],
        ].join(" ")}
      >
        {eyebrow}
      </span>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

export function FloatingNotice({
  message,
  errorMessage,
  savedRecord,
}: FloatingNoticeProps) {
  if (!message && !errorMessage) {
    return null;
  }

  const isError = Boolean(errorMessage);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 w-full max-w-sm px-4">
      <div
        className={[
          "pointer-events-auto rounded-2xl border px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur",
          isError
            ? "border-rose-200 bg-white text-rose-700"
            : "border-emerald-200 bg-white text-slate-800",
        ].join(" ")}
      >
        <p
          className={`text-sm font-semibold ${isError ? "text-rose-700" : "text-emerald-700"}`}
        >
          {errorMessage || message}
        </p>
        {!isError && savedRecord ? (
          <p className="mt-2 text-xs text-slate-600">
            Operacion: {String(savedRecord.nombre_operacion ?? "Sin dato")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  disabled = false,
}: InputFieldProps) {
  return (
    <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  tone,
}: SelectFieldProps) {
  return (
    <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100",
          TONE_CLASS[tone],
        ].join(" ")}
      >
        <option value="">Seleccione una opcion</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BooleanField({
  label,
  value,
  onChange,
  tone,
}: BooleanFieldProps) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 text-sm font-medium text-slate-700">{label}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <BooleanOption
          name={label}
          label="Si"
          checked={value === true}
          onSelect={() => onChange(true)}
          tone={tone}
        />
        <BooleanOption
          name={label}
          label="No"
          checked={value === false}
          onSelect={() => onChange(false)}
          tone={tone}
        />
      </div>
    </fieldset>
  );
}

function BooleanOption({
  name,
  label,
  checked,
  onSelect,
  tone,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  tone: "sky" | "amber" | "rose";
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
        checked
          ? `${TONE_BG_CLASS[tone]} text-white`
          : "border-slate-300 bg-white text-slate-700",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="h-4 w-4 accent-current"
      />
      {label}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  disabled = false,
  tone,
}: TextAreaFieldProps) {
  return (
    <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea
        value={value}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={[
          "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100",
          TONE_CLASS[tone],
        ].join(" ")}
      />
    </label>
  );
}

export function FileField({
  label,
  file,
  onChange,
  optional = false,
  disabled = false,
}: FileFieldProps) {
  return (
    <label className="min-w-0 flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-700">
      <span>
        {label}
        {optional ? " (opcional)" : ""}
      </span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed"
      />
      <span className="text-xs text-slate-500">
        {file ? `Archivo seleccionado: ${file.name}` : "Sin archivo seleccionado"}
      </span>
      <span className="text-xs text-slate-400">
        Formatos: JPG, PNG, WEBP, HEIC. Maximo 8 MB.
      </span>
    </label>
  );
}

export function OperationPreviewCard({
  placa,
  fecha,
  operationName,
}: OperationPreviewCardProps) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
      <span className="block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        Previsualizacion
      </span>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <PreviewChip label="Placa normalizada" value={placa || "Sin dato"} />
        <PreviewChip label="Fecha" value={fecha || "Sin dato"} />
        <PreviewChip
          label="Operacion"
          value={operationName || "Completa placa y fecha"}
        />
      </div>
    </section>
  );
}

function PreviewChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <p className="mt-2 break-all text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
