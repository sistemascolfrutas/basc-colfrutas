const MAX_IMAGE_SIZE_MB = 8;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateOperationDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} debe tener el formato AAAA-MM-DD.`);
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const selected = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(selected.getTime())) {
    throw new Error(`${label} no es una fecha valida.`);
  }

  if (
    selected.getFullYear() !== year ||
    selected.getMonth() !== month - 1 ||
    selected.getDate() !== day
  ) {
    throw new Error(`${label} no es una fecha valida.`);
  }

  if (selected > today) {
    throw new Error(`${label} no puede estar en el futuro.`);
  }
}

export function validateRequiredBoolean(
  value: boolean | null,
  label: string,
) {
  if (value === null) {
    throw new Error(`Debes responder el campo "${label}".`);
  }
}

export function validatePlate(placa: string) {
  const normalized = placa.replace(/\s+/g, "").toUpperCase().trim();

  if (!/^[A-Z0-9]{5,8}$/.test(normalized)) {
    throw new Error(
      "La placa debe tener entre 5 y 8 caracteres alfanumericos.",
    );
  }
}

export function validateRequiredText(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} es obligatorio.`);
  }
}

export function validateOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
  label: string,
) {
  validateRequiredText(value, label);

  if (!allowedValues.includes(value as T)) {
    throw new Error(`${label} tiene un valor no permitido.`);
  }
}

export function validateImageFile(
  file: File | null,
  label: string,
  optional = false,
) {
  if (!file) {
    if (optional) {
      return;
    }

    throw new Error(`Debes cargar "${label}".`);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `"${label}" debe ser una imagen JPG, PNG, WEBP o HEIC.`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `"${label}" supera el limite de ${MAX_IMAGE_SIZE_MB} MB.`,
    );
  }
}

export function validateUniqueSelections(values: string[], label: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new Error(`${label} no puede repetir valores.`);
  }
}
