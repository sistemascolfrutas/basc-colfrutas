import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME =
  process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";

export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function extractStoragePath(value: string) {
  if (!value) {
    return value;
  }

  if (!isAbsoluteUrl(value)) {
    return value.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(value);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const signedMarker = `/storage/v1/object/sign/${BUCKET_NAME}/`;

    const publicIndex = parsed.pathname.indexOf(marker);
    if (publicIndex >= 0) {
      return parsed.pathname.slice(publicIndex + marker.length);
    }

    const signedIndex = parsed.pathname.indexOf(signedMarker);
    if (signedIndex >= 0) {
      return parsed.pathname.slice(signedIndex + signedMarker.length);
    }

    return value;
  } catch {
    return value;
  }
}

export async function createSignedEvidenceUrl(
  supabase: SupabaseClient,
  value: string,
  expiresIn = 60 * 15,
) {
  if (!value) {
    return value;
  }

  if (isAbsoluteUrl(value) && !value.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
    return value;
  }

  const path = extractStoragePath(value);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`No fue posible firmar la evidencia ${path}: ${error.message}`);
  }

  return data.signedUrl;
}

export async function signEvidenceUrlsInRecord(
  supabase: SupabaseClient,
  record: Record<string, unknown> | null,
) {
  if (!record) {
    return null;
  }

  const cloned = { ...record };

  for (const [key, value] of Object.entries(cloned)) {
    if (key.endsWith("_url") && typeof value === "string" && value) {
      cloned[key] = await createSignedEvidenceUrl(supabase, value);
    }
  }

  return cloned;
}
