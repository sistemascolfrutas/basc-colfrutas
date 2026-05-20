import { jsPDF } from "jspdf";

import type { AuditDetail, AuditEvidence } from "@/lib/audit";
import { formatEvidenceLabel, normalizeEvidenceUrl } from "@/lib/evidence";

type PdfImage = {
  dataUrl: string;
  format: "JPEG" | "PNG";
};

type TableColumn = {
  key: string;
  title: string;
  width: number;
  align?: "left" | "center" | "right";
};

type TableRow = Record<string, string>;

const PAGE_MARGIN = 8;
const LINE_COLOR = [31, 41, 55] as const;
const HEADER_GRAY = [174, 174, 174] as const;
const SOFT_GRAY = [241, 245, 249] as const;
const LIGHT_BLUE = [226, 235, 244] as const;
const GREEN = [0, 176, 80] as const;
const TEXT_COLOR = [15, 23, 42] as const;

const FORM_TITLES = {
  "F-SU-01": "Ingreso de unidad",
  "F-SU-02": "Inspeccion fisica e inocuidad",
  "F-SU-03": "Cargue y aseguramiento",
  "F-SU-04": "Salida de unidad",
} as const;

export async function generateAuditPdf(detail: AuditDetail) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });

  const logo = await loadPublicImage("/logo.png");
  let y = PAGE_MARGIN;

  y = addDocumentHeader(doc, detail, logo, y);
  y = addOperationData(doc, detail, y + 2);
  y = addProcessSummary(doc, detail, y + 3);
  y = addFormTables(doc, detail, y + 2);
  await addEvidenceSection(doc, detail, y + 3);

  addPageFooters(doc, detail.operacion.nombre_operacion);
  doc.save(`${detail.operacion.nombre_operacion}-informe-basc.pdf`);
}

function addDocumentHeader(
  doc: jsPDF,
  detail: AuditDetail,
  logo: PdfImage | null,
  y: number,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const x = PAGE_MARGIN;
  const height = 23;
  const logoWidth = 58;
  const metaWidth = 42;
  const titleWidth = contentWidth - logoWidth - metaWidth;

  setLine(doc);
  doc.rect(x, y, contentWidth, height);
  doc.line(x + logoWidth, y, x + logoWidth, y + height);
  doc.line(x + logoWidth + titleWidth, y, x + logoWidth + titleWidth, y + height);

  if (logo) {
    const dims = fitImage(doc, logo.dataUrl, logoWidth - 12, height - 8);
    doc.addImage(
      logo.dataUrl,
      logo.format,
      x + 6,
      y + (height - dims.height) / 2,
      dims.width,
      dims.height,
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...TEXT_COLOR);
    doc.text("COLFRUTAS", x + logoWidth / 2, y + 13, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("FORMATO", x + logoWidth + titleWidth / 2, y + 7, { align: "center" });
  doc.setFontSize(10);
  doc.text("INFORME FINAL DE TRAZABILIDAD BASC", x + logoWidth + titleWidth / 2, y + 12, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "Inspeccion, cargue, aseguramiento y salida de unidad",
    x + logoWidth + titleWidth / 2,
    y + 17,
    { align: "center" },
  );

  const metaX = x + logoWidth + titleWidth;
  const metaRows = [
    ["Codigo:", "BASC-COL-01"],
    ["Version:", "01"],
    ["Fecha:", formatDate(new Date())],
    ["Operacion:", detail.operacion.nombre_operacion],
  ];
  const rowHeight = height / metaRows.length;
  metaRows.forEach(([label, value], index) => {
    const rowY = y + rowHeight * index;
    if (index > 0) {
      doc.line(metaX, rowY, metaX + metaWidth, rowY);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.7);
    doc.text(label, metaX + 1.5, rowY + 3.7);
    doc.setFont("helvetica", "normal");
    doc.text(truncate(doc, value, metaWidth - 15), metaX + 14, rowY + 3.7);
  });

  return y + height;
}

function addOperationData(doc: jsPDF, detail: AuditDetail, y: number) {
  y = addBand(doc, "1. DATOS DEL CONDUCTOR Y DEL VEHICULO", y);

  const fsu01 = detail.fsu01 ?? {};
  const fsu02 = detail.fsu02 ?? {};
  const fsu04 = detail.fsu04 ?? {};
  const rows: Array<Array<[string, string]>> = [
    [
      ["Codigo", detail.operacion.nombre_operacion],
      ["Fecha inspeccion", valueFrom(fsu02, "fecha_inspeccion") || detail.operacion.fecha],
      ["Estado final", buildOverallState(detail)],
    ],
    [
      ["Nombre conductor", detail.operacion.conductor || valueFrom(fsu01, "nombre_conductor")],
      ["C.C.", valueFrom(fsu01, "numero_cedula")],
      ["Placa cabezote", detail.operacion.placa],
    ],
    [
      ["Empresa transportadora", detail.operacion.empresa_transportadora || ""],
      ["Remolque / contenedor", valueFrom(fsu02, "numero_remolque_contenedor")],
      ["Placa / contenedor salida", valueFrom(fsu04, "placa_numero_contenedor")],
    ],
    [
      ["Tipo operacion", joinOther(valueFrom(fsu01, "tipo_operacion"), valueFrom(fsu01, "tipo_operacion_otro"))],
      ["Tipo vehiculo", joinOther(valueFrom(fsu01, "tipo_vehiculo"), valueFrom(fsu01, "tipo_vehiculo_otro"))],
      ["Responsable ingreso", valueFrom(fsu01, "responsable")],
    ],
    [
      ["Responsable inspeccion", valueFrom(fsu02, "responsable_inspeccion")],
      ["Resultado inspeccion", valueFrom(fsu02, "resultado_final_inspeccion")],
      ["Autoriza cargue", valueFrom(fsu02, "se_autoriza_para_cargue")],
    ],
  ];

  return addFieldGrid(doc, rows, y);
}

function addProcessSummary(doc: jsPDF, detail: AuditDetail, y: number) {
  y = addBand(doc, "2. RESUMEN DEL PROCESO", y);

  const rows = [
    {
      form: "F-SU-01",
      name: FORM_TITLES["F-SU-01"],
      state: detail.operacion.estado_ingreso,
      result: valueFrom(detail.fsu01, "autoriza_ingreso"),
      observations: valueFrom(detail.fsu01, "observaciones"),
    },
    {
      form: "F-SU-02",
      name: FORM_TITLES["F-SU-02"],
      state: detail.operacion.estado_inspeccion,
      result: valueFrom(detail.fsu02, "resultado_final_inspeccion"),
      observations: valueFrom(detail.fsu02, "descripcion_novedad"),
    },
    {
      form: "F-SU-03",
      name: FORM_TITLES["F-SU-03"],
      state: detail.operacion.estado_cargue,
      result: valueFrom(detail.fsu03, "se_realizo_cargue"),
      observations: valueFrom(detail.fsu03, "observaciones_cargue"),
    },
    {
      form: "F-SU-04",
      name: FORM_TITLES["F-SU-04"],
      state: detail.operacion.estado_salida,
      result: valueFrom(detail.fsu04, "puertas_cerradas_sellos_instalados"),
      observations: "",
    },
  ].map((row) => ({
    form: row.form,
    name: row.name,
    state: formatState(row.state),
    result: row.result || "Sin dato",
    observations: row.observations || "Sin observaciones",
  }));

  return addTable(
    doc,
    y,
    [
      { key: "form", title: "Formato", width: 28, align: "center" },
      { key: "name", title: "Proceso", width: 74 },
      { key: "state", title: "Estado", width: 40, align: "center" },
      { key: "result", title: "Resultado", width: 44, align: "center" },
      { key: "observations", title: "Observaciones", width: 95 },
    ],
    rows,
    { headerFill: LIGHT_BLUE },
  );
}

function addFormTables(doc: jsPDF, detail: AuditDetail, y: number) {
  const forms = [
    ["F-SU-01", detail.fsu01],
    ["F-SU-02", detail.fsu02],
    ["F-SU-03", detail.fsu03],
    ["F-SU-04", detail.fsu04],
  ] as const;

  forms.forEach(([code, record], index) => {
    if (!record) {
      return;
    }

    y = ensureSpace(doc, y, 22);
    y = addBand(doc, `${index + 3}. ${code} - ${FORM_TITLES[code]}`, y);

    const rows = buildFormRows(record);
    y = addTable(
      doc,
      y,
      [
        { key: "number", title: "#", width: 12, align: "center" },
        { key: "criterion", title: "CRITERIOS / CAMPOS REGISTRADOS", width: 154 },
        { key: "complies", title: "CUMPLE / VALOR", width: 44, align: "center" },
        { key: "observations", title: "OBSERVACIONES", width: 71 },
      ],
      rows,
      { headerFill: SOFT_GRAY },
    );
  });

  return y;
}

async function addEvidenceSection(doc: jsPDF, detail: AuditDetail, y: number) {
  const evidences = collectAuditEvidences(detail);

  if (evidences.length === 0) {
    return y;
  }

  y = ensureSpace(doc, y, 24);
  y = addBand(doc, "EVIDENCIAS FOTOGRAFICAS", y, GREEN);

  for (const group of ["F-SU-01", "F-SU-02", "F-SU-03", "F-SU-04"] as const) {
    const items = evidences.filter((item) => item.group === group);
    if (items.length === 0) {
      continue;
    }

    y = ensureSpace(doc, y, 18);
    y = addSubBand(doc, `${group} - ${FORM_TITLES[group]}`, y);

    for (let index = 0; index < items.length; index += 2) {
      const pair = items.slice(index, index + 2);
      y = ensureSpace(doc, y, 60);
      y = await addEvidencePair(doc, pair, y);
    }
  }

  return y;
}

async function addEvidencePair(doc: jsPDF, items: AuditEvidence[], y: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const gap = 4;
  const cellWidth = (contentWidth - gap) / 2;
  const cellHeight = 58;
  const imageHeight = 45;

  for (const [index, item] of items.entries()) {
    const x = PAGE_MARGIN + index * (cellWidth + gap);
    setLine(doc);
    doc.rect(x, y, cellWidth, cellHeight);
    doc.setFillColor(...SOFT_GRAY);
    doc.rect(x, y, cellWidth, 8, "F");
    setLine(doc);
    doc.rect(x, y, cellWidth, 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(truncate(doc, item.label, cellWidth - 4), x + 2, y + 5.3);

    const image = await loadImageAsDataUrl(item.url);
    if (image) {
      try {
        const dims = fitImage(doc, image.dataUrl, cellWidth - 8, imageHeight - 4);
        doc.addImage(
          image.dataUrl,
          image.format,
          x + (cellWidth - dims.width) / 2,
          y + 10 + (imageHeight - dims.height) / 2,
          dims.width,
          dims.height,
        );
      } catch {
        drawImagePlaceholder(doc, x, y + 8, cellWidth, imageHeight, "No fue posible insertar la imagen.");
      }
    } else {
      drawImagePlaceholder(doc, x, y + 8, cellWidth, imageHeight, "Imagen no disponible.");
    }
  }

  return y + cellHeight + 4;
}

function addBand(
  doc: jsPDF,
  title: string,
  y: number,
  fill: readonly [number, number, number] = HEADER_GRAY,
) {
  y = ensureSpace(doc, y, 9);
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  doc.setFillColor(...fill);
  setLine(doc);
  doc.rect(PAGE_MARGIN, y, contentWidth, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(fill === GREEN ? 255 : TEXT_COLOR[0], fill === GREEN ? 255 : TEXT_COLOR[1], fill === GREEN ? 255 : TEXT_COLOR[2]);
  doc.text(title.toUpperCase(), PAGE_MARGIN + contentWidth / 2, y + 5.4, {
    align: "center",
  });
  doc.setTextColor(...TEXT_COLOR);

  return y + 8;
}

function addSubBand(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 8);
  const contentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  doc.setFillColor(...SOFT_GRAY);
  setLine(doc);
  doc.rect(PAGE_MARGIN, y, contentWidth, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, PAGE_MARGIN + 2, y + 4.8);
  return y + 7;
}

function addFieldGrid(doc: jsPDF, rows: Array<Array<[string, string]>>, y: number) {
  const contentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const cellWidth = contentWidth / 3;
  const labelWidth = 34;
  const rowHeight = 8;

  rows.forEach((row) => {
    y = ensureSpace(doc, y, rowHeight);
    row.forEach(([label, value], colIndex) => {
      const x = PAGE_MARGIN + colIndex * cellWidth;
      setLine(doc);
      doc.rect(x, y, cellWidth, rowHeight);
      doc.setFillColor(...SOFT_GRAY);
      doc.rect(x, y, labelWidth, rowHeight, "F");
      setLine(doc);
      doc.rect(x, y, labelWidth, rowHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(`${label}:`, x + 1.5, y + 5);
      doc.setFont("helvetica", "normal");
      doc.text(truncate(doc, value || "Sin dato", cellWidth - labelWidth - 3), x + labelWidth + 1.5, y + 5);
    });
    y += rowHeight;
  });

  return y;
}

function addTable(
  doc: jsPDF,
  startY: number,
  columns: TableColumn[],
  rows: TableRow[],
  options?: { headerFill?: readonly [number, number, number] },
) {
  let y = startY;
  const rowPadding = 2;
  const lineHeight = 3.6;
  const minRowHeight = 7.5;
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);

  const drawHeader = () => {
    y = ensureSpace(doc, y, 10);
    doc.setFillColor(...(options?.headerFill ?? SOFT_GRAY));
    setLine(doc);
    doc.rect(PAGE_MARGIN, y, tableWidth, 8, "FD");
    let x = PAGE_MARGIN;
    columns.forEach((column) => {
      doc.line(x, y, x, y + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(column.title, x + column.width / 2, y + 5.2, { align: "center" });
      x += column.width;
    });
    doc.line(PAGE_MARGIN + tableWidth, y, PAGE_MARGIN + tableWidth, y + 8);
    y += 8;
  };

  drawHeader();

  rows.forEach((row) => {
    const cellLines = columns.map((column) =>
      doc.splitTextToSize(row[column.key] || "", column.width - rowPadding * 2),
    );
    const rowHeight = Math.max(minRowHeight, Math.max(...cellLines.map((lines) => lines.length)) * lineHeight + rowPadding * 2);

    if (y + rowHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN - 6) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeader();
    }

    let x = PAGE_MARGIN;
    setLine(doc);
    doc.rect(PAGE_MARGIN, y, tableWidth, rowHeight);
    columns.forEach((column, columnIndex) => {
      doc.line(x, y, x, y + rowHeight);
      doc.setFont("helvetica", column.key === "criterion" ? "normal" : "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXT_COLOR);
      const lines = cellLines[columnIndex];
      const textX =
        column.align === "center"
          ? x + column.width / 2
          : column.align === "right"
            ? x + column.width - rowPadding
            : x + rowPadding;
      doc.text(lines, textX, y + rowPadding + 2.6, { align: column.align ?? "left" });
      x += column.width;
    });
    doc.line(PAGE_MARGIN + tableWidth, y, PAGE_MARGIN + tableWidth, y + rowHeight);
    y += rowHeight;
  });

  return y;
}

function buildFormRows(record: Record<string, unknown>) {
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

  return Object.entries(record)
    .filter(([key, value]) => !blockedKeys.has(key) && !key.endsWith("_url") && value !== null)
    .map(([key, value], index) => ({
      number: String(index + 1),
      criterion: formatLabel(key),
      complies: isObservationKey(key) ? "" : formatValue(value),
      observations: isObservationKey(key) ? formatValue(value) : "",
    }));
}

function addPageFooters(doc: jsPDF, operationName: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(operationName, PAGE_MARGIN, pageHeight - 4);
    doc.text(`Pagina ${index} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 4, {
      align: "right",
    });
  }
}

function drawImagePlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
) {
  doc.setFillColor(248, 250, 252);
  setLine(doc);
  doc.rect(x + 2, y + 2, width - 4, height - 4, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(text, x + width / 2, y + height / 2, { align: "center" });
  doc.setTextColor(...TEXT_COLOR);
}

function buildOverallState(detail: AuditDetail) {
  const states = [
    detail.operacion.estado_ingreso,
    detail.operacion.estado_inspeccion,
    detail.operacion.estado_cargue,
    detail.operacion.estado_salida,
  ];

  return states.every((state) => state === "completo") ? "Completo" : "En proceso";
}

function collectAuditEvidences(detail: AuditDetail): AuditEvidence[] {
  return [
    ...mapEvidenceGroup("F-SU-01", detail.fsu01),
    ...mapEvidenceGroup("F-SU-02", detail.fsu02),
    ...mapEvidenceGroup("F-SU-03", detail.fsu03),
    ...mapEvidenceGroup("F-SU-04", detail.fsu04),
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

async function loadPublicImage(path: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return loadImageAsDataUrl(new URL(path, window.location.origin).toString());
}

async function loadImageAsDataUrl(url: string): Promise<PdfImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return {
      dataUrl,
      format: dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG",
    };
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
  const ratio = Math.min(maxWidth / props.width, maxHeight / props.height, 1);
  return {
    width: props.width * ratio,
    height: props.height * ratio,
  };
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + needed > pageHeight - PAGE_MARGIN - 6) {
    doc.addPage();
    return PAGE_MARGIN;
  }

  return y;
}

function setLine(doc: jsPDF) {
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.18);
}

function valueFrom(record: Record<string, unknown> | null, key: string) {
  if (!record || record[key] === null || record[key] === undefined || record[key] === "") {
    return "";
  }

  return formatValue(record[key]);
}

function formatLabel(key: string) {
  const custom: Record<string, string> = {
    fecha_registro: "Fecha de registro",
    hora_registro: "Hora de registro",
    fecha_inspeccion: "Fecha de inspeccion",
    numero_remolque_contenedor: "Numero de remolque o contenedor",
    estado_general_externo_unidad: "Estado general externo de la unidad",
    estado_paredes_laterales: "Estado de paredes laterales",
    estado_sistema_cierre: "Estado del sistema de cierre",
    ausencia_perforaciones_danios_visibles: "Ausencia de perforaciones o danos visibles",
    ausencia_elementos_extranos: "Ausencia de elementos extranos",
    condicion_estructural_apta_para_cargue: "Condicion estructural apta para cargue",
    limpieza_interna_unidad: "Limpieza interna de la unidad",
    ausencia_residuos: "Ausencia de residuos",
    ausencia_olores_extranos: "Ausencia de olores extranos",
    ausencia_humedad_derrame: "Ausencia de humedad o derrame",
    ausencia_contaminacion_visible: "Ausencia de contaminacion visible",
    condicion_apta_para_producto_a_transportar: "Condicion apta para el producto a transportar",
    resultado_final_inspeccion: "Resultado final de la inspeccion",
    se_autoriza_para_cargue: "Se autoriza para cargue",
    se_detecto_novedad: "Se detecto novedad",
    descripcion_novedad: "Descripcion de la novedad",
    se_realizo_cargue: "Se realizo cargue",
    observaciones_cargue: "Observaciones del cargue",
    puertas_cerradas_sellos_instalados: "Puertas cerradas y sellos instalados",
    fecha_hora_salida: "Fecha y hora de salida",
    placa_numero_contenedor: "Placa del vehiculo / numero de contenedor",
  };

  return (
    custom[key] ??
    key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (match) => match.toUpperCase())
  );
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "SI" : "NO";
  }

  return String(value);
}

function formatState(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function joinOther(value: string, other: string) {
  if (!value) {
    return other;
  }

  return other ? `${value} - ${other}` : value;
}

function isObservationKey(key: string) {
  return key.includes("observacion") || key.includes("descripcion");
}

function truncate(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) {
    return value;
  }

  let output = value;
  while (output.length > 1 && doc.getTextWidth(`${output}...`) > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}...`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
