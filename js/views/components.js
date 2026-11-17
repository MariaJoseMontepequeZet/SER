import { esc, fmtDate, fmtDateTime } from "../utils.js";
import { isPastDue, preguntasOf } from "../domain.js";

export const chip = (kind, label) => `<span class="chip ${kind}">${esc(label)}</span>`;

export function estadoChip(tarea, entrega) {
  if (entrega) return entrega.tarde ? chip("warn", "Entregada tarde") : chip("ok", "Entregada");
  if (!tarea?.activa) return chip("bad", "Cerrada");
  if (isPastDue(tarea)) return chip("bad", "Vencida");
  return chip("warn", "Pendiente");
}

export const notice = (text, kind = "") => `<div class="notice ${kind}">${esc(text)}</div>`;

export const mutedText = (text) => `<p class="muted flush">${esc(text)}</p>`;

export const mutedCard = (text) => `<div class="card">${mutedText(text)}</div>`;

export const pluralize = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

export function entregaDetalle(tarea, entrega) {
  const respuestas = preguntasOf(tarea, entrega)
    .map(
      (pregunta, index) => `<div class="field">
        <span class="strong">${index + 1}. ${esc(pregunta.label)}</span>
        <div class="answer">${esc(entrega.respuestas?.[pregunta.id] || "(sin respuesta)")}</div>
      </div>`,
    )
    .join("");

  return `<div class="stats">
    <div class="stat"><span class="hint">Nombre completo</span><strong>${esc(entrega.nombre)}</strong></div>
    <div class="stat"><span class="hint">Fecha</span><span>${fmtDate(entrega.fecha)}</span></div>
    <div class="stat"><span class="hint">Entregada</span><span>${fmtDateTime(entrega.enviada)}${entrega.tarde ? " " + chip("warn", "tarde") : ""}</span></div>
  </div>${respuestas}`;
}
