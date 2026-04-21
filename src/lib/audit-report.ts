import { jsPDF } from "jspdf";

import type { AuditDetail, AuditEvidence } from "@/lib/audit";
import { formatEvidenceLabel, normalizeEvidenceUrl } from "@/lib/evidence";

export async function generateAuditPdf(detail: AuditDetail) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  y = addTitle(doc, "Informe de Trazabilidad BASC", y, margin);
  y = addSubtitle(doc, detail.operacion.nombre_operacion, y, margin);

  y = addSectionTitle(doc, "Operacion maestra", y, margin);
  y = addKeyValueBlock(
    doc,
    [
      ["Placa", detail.operacion.placa],
      ["Fecha", detail.operacion.fecha],
      ["Conductor", detail.operacion.conductor || "Sin dato"],
      ["Transportadora", detail.operacion.empresa_transportadora || "Sin dato"],
      ["Estado ingreso", detail.operacion.estado_ingreso],
      ["Estado inspeccion", detail.operacion.estado_inspeccion],
      ["Estado cargue", detail.operacion.estado_cargue],
      ["Estado salida", detail.operacion.estado_salida],
    ],
    y,
    margin,
    contentWidth,
  );

  y = addFormSummary(doc, "F-SU-01", detail.fsu01, y, margin, contentWidth);
  y = addFormSummary(doc, "F-SU-02", detail.fsu02, y, margin, contentWidth);
  y = addFormSummary(doc, "F-SU-03", detail.fsu03, y, margin, contentWidth);

  const evidencias = collectAuditEvidences(detail);

  if (evidencias.length > 0) {
    for (const group of ["F-SU-01", "F-SU-02", "F-SU-03"] as const) {
      const items = evidencias.filter((item) => item.group === group);
      if (items.length === 0) {
        continue;
      }

      y = ensureSpace(doc, y, 18);
      y = addSectionTitle(doc, `Evidencias ${group}`, y, margin);

      for (const item of items) {
        y = ensureSpace(doc, y, 70);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(item.label, margin, y);
        y += 5;

        const imageData = await loadImageAsDataUrl(item.url);
        if (imageData) {
          try {
            const dims = fitImage(doc, imageData, contentWidth, 58);
            doc.addImage(imageData, "JPEG", margin, y, dims.width, dims.height);
            y += dims.height + 5;
          } catch {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("No fue posible insertar esta imagen en el PDF.", margin, y);
            y += 6;
          }
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text("Imagen no disponible.", margin, y);
          y += 6;
        }

        y += 4;
      }
    }
  }

  doc.save(`${detail.operacion.nombre_operacion}-informe-basc.pdf`);
}

function addTitle(doc: jsPDF, title: string, y: number, margin: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, y);
  return y + 8;
}

function addSubtitle(doc: jsPDF, title: string, y: number, margin: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(title, margin, y);
  return y + 8;
}

function addSectionTitle(doc: jsPDF, title: string, y: number, margin: number) {
  y = ensureSpace(doc, y, 16);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y - 4, 80, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, margin + 3, y + 1.5);
  return y + 8;
}

function addKeyValueBlock(
  doc: jsPDF,
  entries: Array<[string, string]>,
  y: number,
  margin: number,
  contentWidth: number,
) {
  for (const [label, value] of entries) {
    y = ensureSpace(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const labelText = `${label}:`;
    doc.text(labelText, margin, y);
    const labelWidth = doc.getTextWidth(labelText) + 3;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, Math.max(40, contentWidth - labelWidth));
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(5, lines.length * 4.2);
  }

  return y + 3;
}

function addFormSummary(
  doc: jsPDF,
  title: string,
  record: Record<string, unknown> | null,
  y: number,
  margin: number,
  contentWidth: number,
) {
  if (!record) {
    return y;
  }

  y = addSectionTitle(doc, title, y, margin);
  const blockedKeys = new Set([
    "id",
    "created_at",
    "updated_at",
    "nombre_operacion",
    "placa",
  ]);
  const lines = Object.entries(record)
    .filter(
      ([key, value]) =>
        !blockedKeys.has(key) && !key.endsWith("_url") && value !== null,
    )
    .slice(0, 10)
    .map(([key, value]) => [formatLabel(key), formatValue(value)] as [string, string]);

  return addKeyValueBlock(doc, lines, y, margin, contentWidth);
}

function formatLabel(key: string) {
  return key.replaceAll("_", " ");
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return String(value);
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }

  return y;
}

function collectAuditEvidences(detail: AuditDetail): AuditEvidence[] {
  return [
    ...mapEvidenceGroup("F-SU-01", detail.fsu01),
    ...mapEvidenceGroup("F-SU-02", detail.fsu02),
    ...mapEvidenceGroup("F-SU-03", detail.fsu03),
  ];
}

function mapEvidenceGroup(
  group: AuditEvidence["group"],
  record: Record<string, unknown> | null,
): AuditEvidence[] {
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

async function loadImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fitImage(doc: jsPDF, dataUrl: string, maxWidth: number, maxHeight: number) {
  const props = doc.getImageProperties(dataUrl);
  const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
  return {
    width: props.width * ratio,
    height: props.height * ratio,
  };
}
