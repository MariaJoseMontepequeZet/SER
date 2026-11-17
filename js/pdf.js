import { fmtDate, fmtDateTime } from "./utils.js";
import { preguntasOf } from "./domain.js";

const ACCENT = [13, 122, 104];
const INK = [22, 35, 42];
const LINE = [213, 223, 219];
const MUTED = [120, 130, 130];
const MARGIN = 18;

function drawCover(doc, { tarea, entrega }, width, textWidth) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, width, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(entrega.titulo || tarea?.titulo || "Tarea", textWidth)[0], MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Buzón de Tareas  ·  Fecha límite: ${fmtDate(tarea?.fechaLimite)}`, MARGIN, 22);
}

function drawEntrega(doc, item) {
  const { tarea, entrega } = item;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const textWidth = width - MARGIN * 2;
  let y = 42;

  drawCover(doc, item, width, textWidth);
  doc.setTextColor(...INK);

  const field = (label, value) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || "—"), MARGIN + 42, y);
    y += 7;
  };
  field("Nombre completo:", entrega.nombre);
  field("Fecha:", fmtDate(entrega.fecha));
  field("Entregada:", fmtDateTime(entrega.enviada) + (entrega.tarde ? "  (tarde)" : ""));

  y += 3;
  doc.setDrawColor(...LINE);
  doc.line(MARGIN, y, width - MARGIN, y);
  y += 9;

  const ensureSpace = (needed) => {
    if (y + needed > height - 18) {
      doc.addPage();
      y = 20;
    }
  };

  preguntasOf(tarea, entrega).forEach((pregunta, index) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ACCENT);
    const label = doc.splitTextToSize(`${index + 1}. ${pregunta.label}`, textWidth);
    ensureSpace(label.length * 6 + 6);
    doc.text(label, MARGIN, y);
    y += label.length * 6 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const answer = String(entrega.respuestas?.[pregunta.id] || "(sin respuesta)");
    for (const paragraph of answer.split("\n")) {
      for (const line of doc.splitTextToSize(paragraph || " ", textWidth)) {
        ensureSpace(6);
        doc.text(line, MARGIN, y);
        y += 5.6;
      }
    }
    y += 6;
  });
}

export function buildPdf(items) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  items.forEach((item, index) => {
    if (index > 0) doc.addPage();
    drawEntrega(doc, item);
  });

  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${page} de ${pages}`, width - MARGIN, height - 10, { align: "right" });
  }
  return doc.output("blob");
}

export class PdfUnavailableError extends Error {}

export async function downloadPdf(downloads, items, filename) {
  if (!downloads) throw new PdfUnavailableError("La descarga no está disponible en esta vista.");
  if (!window.jspdf) throw new PdfUnavailableError("No cargó el generador de PDF. Recargá la página.");
  await downloads.save({ filename, data: buildPdf(items) });
}
