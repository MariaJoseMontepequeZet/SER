import { fmtDate, fmtTime, uid } from "./utils.js";

export const entregasOf = (cuenta) => cuenta?.entregas ?? {};

export function isPastDue(tarea) {
  if (!tarea?.fechaLimite) return false;
  const time = tarea.horaLimite ? `${tarea.horaLimite}:00` : "23:59:59";
  return new Date() > new Date(`${tarea.fechaLimite}T${time}`);
}

export const isOpen = (tarea) => Boolean(tarea?.activa) && !(tarea.cierreAutomatico && isPastDue(tarea));

export function deadlineLabel(tarea) {
  if (!tarea?.fechaLimite) return "—";
  const time = fmtTime(tarea.horaLimite);
  return time ? `${fmtDate(tarea.fechaLimite)}, ${time}` : fmtDate(tarea.fechaLimite);
}

export const firstName = (name) => String(name || "").split(" ")[0];

export const preguntasOf = (tarea, entrega) =>
  entrega?.preguntas?.length ? entrega.preguntas : (tarea?.preguntas ?? []);

export const newPregunta = () => ({ id: uid(), label: "", ayuda: "", tipo: "larga", requerida: true });

export function resumenDe(cuenta, tareas) {
  const entregas = Object.values(entregasOf(cuenta));
  const tarde = entregas.filter((entrega) => entrega.tarde).length;
  const pendientes = tareas.filter((tarea) => isOpen(tarea) && !entregasOf(cuenta)[tarea.id]).length;
  return { total: entregas.length, tarde, aTiempo: entregas.length - tarde, pendientes };
}

export function draftFrom(tarea, { copy = false } = {}) {
  if (!tarea) {
    return {
      id: null,
      nuevo: true,
      titulo: "",
      instrucciones: "",
      fechaLimite: "",
      horaLimite: "",
      cierreAutomatico: false,
      activa: true,
      preguntas: [newPregunta()],
      creada: null,
    };
  }
  return {
    id: copy ? null : tarea.id,
    nuevo: copy,
    titulo: (copy ? "Copia de " : "") + (tarea.titulo || ""),
    instrucciones: tarea.instrucciones || "",
    fechaLimite: tarea.fechaLimite || "",
    horaLimite: tarea.horaLimite || "",
    cierreAutomatico: Boolean(tarea.cierreAutomatico),
    activa: copy ? false : Boolean(tarea.activa),
    preguntas: (tarea.preguntas || []).map((pregunta) => ({ ...pregunta })),
    creada: copy ? null : tarea.creada,
  };
}

export function tareaPayload(draft) {
  const preguntas = draft.preguntas
    .filter((pregunta) => pregunta.label.trim())
    .map((pregunta) => ({
      id: pregunta.id || uid(),
      label: pregunta.label.trim(),
      ayuda: (pregunta.ayuda || "").trim(),
      tipo: pregunta.tipo === "corta" ? "corta" : "larga",
      requerida: Boolean(pregunta.requerida),
    }));
  return {
    titulo: draft.titulo.trim(),
    instrucciones: draft.instrucciones.trim(),
    fechaLimite: draft.fechaLimite || "",
    horaLimite: draft.fechaLimite ? draft.horaLimite || "" : "",
    cierreAutomatico: Boolean(draft.fechaLimite && draft.cierreAutomatico),
    activa: Boolean(draft.activa),
    preguntas,
    creada: draft.creada || new Date().toISOString(),
  };
}

export function entregaPayload(tarea, form, previa) {
  const preguntas = tarea.preguntas || [];
  const ahora = new Date().toISOString();
  const respuestas = Object.fromEntries(
    preguntas.map((pregunta) => [pregunta.id, String(form.respuestas[pregunta.id] || "").trim()]),
  );
  return {
    titulo: tarea.titulo,
    nombre: form.nombre.trim(),
    fecha: form.fecha,
    respuestas,
    preguntas: preguntas.map(({ id, label }) => ({ id, label })),
    enviada: previa?.enviada || ahora,
    actualizada: ahora,
    tarde: isPastDue(tarea) || Boolean(previa?.tarde),
  };
}
