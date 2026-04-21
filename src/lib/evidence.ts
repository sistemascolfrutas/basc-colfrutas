const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EVIDENCE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";

export function normalizeEvidenceUrl(url: string) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/";
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) {
      return url;
    }

    const afterMarker = parsed.pathname.slice(index + marker.length);
    const parts = afterMarker.split("/");
    if (parts.length < 2) {
      return url;
    }

    const [, ...rest] = parts;
    parsed.pathname = `${marker}${EVIDENCE_BUCKET}/${rest.join("/")}`;

    if (SUPABASE_URL && parsed.origin !== new URL(SUPABASE_URL).origin) {
      parsed.protocol = new URL(SUPABASE_URL).protocol;
      parsed.host = new URL(SUPABASE_URL).host;
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export function formatEvidenceLabel(key: string) {
  return key
    .replace(/_url$/i, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
