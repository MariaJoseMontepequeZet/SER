import { state, tareaById, isBlocked } from "../state.js";
import { esc, todayStr } from "../utils.js";
import { deadlineLabel, entregasOf, firstName, isOpen, isPastDue } from "../domain.js";
import { renderProfile } from "./profile.js";
import { entregaDetalle, estadoChip, mutedCard, mutedText, notice, pluralize } from "./components.js";

export function renderStudent() {
  const { cuenta } = state;
  if (cuenta === undefined) return mutedCard("Cargando tu perfil…");
  if (cuenta === null) return renderRegistro();
  if (isBlocked(state.userId)) {
    return notice("Tu cuenta está desactivada. Hablá con la persona que administra el grupo.", "bad");
  }
  if (state.view === "form" && state.tareaId) return renderForm();
  if (state.view === "ver" && state.tareaId) return renderEntrega();
  if (state.view === "profile") return renderProfile(state.cuenta);
  return renderHome();
}

export function initialForm(cuenta, tareaId) {
  const entrega = entregasOf(cuenta)[tareaId];
  return {
    nombre: entrega?.nombre || cuenta.nombre || "",
    fecha: entrega?.fecha || todayStr(),
    respuestas: { ...(entrega?.respuestas || {}) },
  };
}

function renderRegistro() {
  return `<form class="card" id="regForm">
    <h2>Creá tu perfil</h2>
    ${mutedText("Escribí tu nombre completo como querés que aparezca en tus entregas.")}
    <div class="field">
      <label for="regNombre">Nombre completo</label>
      <input type="text" id="regNombre" required autocomplete="name" placeholder="Ej. María José Pérez López">
    </div>
    <div class="row"><button class="primary" type="submit">Guardar y continuar</button></div>
  </form>`;
}

function tareaCard(tarea) {
  const entrega = entregasOf(state.cuenta)[tarea.id];
  const id = esc(tarea.id);
  return `<div class="card">
    <div class="row between"><h3>${esc(tarea.titulo)}</h3>${estadoChip(tarea, entrega)}</div>
    <div class="muted small">Fecha límite: ${deadlineLabel(tarea)} · ${(tarea.preguntas || []).length} preguntas</div>
    <div class="row">
      ${entrega ? `<button data-act="ver" data-id="${id}">Ver mi entrega</button>` : ""}
      ${isOpen(tarea) ? `<button class="${entrega ? "" : "primary"}" data-act="resolver" data-id="${id}">${entrega ? "Editar" : "Resolver tarea"}</button>` : ""}
      ${entrega ? `<button data-act="pdfPropio" data-id="${id}">Descargar PDF</button>` : ""}
    </div>
  </div>`;
}

function renderHome() {
  const entregas = entregasOf(state.cuenta);
  const visibles = state.tareas.filter((tarea) => isOpen(tarea) || entregas[tarea.id]);
  const pendientes = visibles.filter((tarea) => isOpen(tarea) && !entregas[tarea.id]).length;
  const estado = pendientes
    ? `Tenés ${pluralize(pendientes, "tarea pendiente", "tareas pendientes")}.`
    : "Estás al día con tus tareas.";
  const lista = visibles.length
    ? visibles.map(tareaCard).join("")
    : mutedCard("Todavía no hay tareas publicadas. Cuando la admin publique una, aparece aquí.");

  return `<div class="card">
    <div class="row between">
      <div><h2>Hola, ${esc(firstName(state.cuenta.nombre))}</h2><div class="muted">${estado}</div></div>
      <button class="ghost" data-act="perfil" data-id="${esc(state.userId)}">Mi perfil</button>
    </div>
    <div class="hint">Tus respuestas solo las ve la administración del grupo.</div>
  </div>
  <div class="list">${lista}</div>`;
}

function preguntaField(pregunta, index, respuestas) {
  const id = esc(pregunta.id);
  const value = esc(respuestas[pregunta.id] || "");
  const input =
    pregunta.tipo === "corta"
      ? `<input type="text" id="q_${id}" data-q="${id}" value="${value}">`
      : `<textarea id="q_${id}" data-q="${id}">${value}</textarea>`;
  const optional = pregunta.requerida ? "" : ` <span class="hint">(opcional)</span>`;
  return `<div class="field">
    <label for="q_${id}">${index + 1}. ${esc(pregunta.label)}${optional}</label>
    ${pregunta.ayuda ? `<span class="hint">${esc(pregunta.ayuda)}</span>` : ""}
    ${input}
  </div>`;
}

function renderForm() {
  const tarea = tareaById(state.tareaId);
  if (!tarea) return notice("Esta tarea ya no existe.", "bad");
  const { form } = state;
  const entrega = entregasOf(state.cuenta)[tarea.id];
  const preguntas = (tarea.preguntas || [])
    .map((pregunta, index) => preguntaField(pregunta, index, form.respuestas))
    .join("");

  return `<form class="card" id="entForm">
    <div class="row between">
      <button type="button" class="ghost" data-act="inicio">← Volver</button>${estadoChip(tarea, entrega)}
    </div>
    <h2>${esc(tarea.titulo)}</h2>
    ${tarea.instrucciones ? `<div class="answer">${esc(tarea.instrucciones)}</div>` : ""}
    <div class="muted small">Fecha límite: ${deadlineLabel(tarea)}</div>
    ${isPastDue(tarea) ? notice("La fecha límite ya pasó. Podés entregar, pero quedará marcada como tarde.") : ""}
    <div class="field"><label for="fNombre">Nombre completo</label><input type="text" id="fNombre" value="${esc(form.nombre)}" required></div>
    <div class="field"><label for="fFecha">Fecha</label><input type="date" id="fFecha" value="${esc(form.fecha)}" required></div>
    <h3 class="spaced">Resolución</h3>
    ${preguntas}
    <div class="row">
      <button class="primary" type="submit" id="btnEnviar">${entrega ? "Guardar cambios" : "Entregar tarea"}</button>
      <button type="button" data-act="inicio">Cancelar</button>
    </div>
  </form>`;
}

function renderEntrega() {
  const tarea = tareaById(state.tareaId);
  const entrega = entregasOf(state.cuenta)[state.tareaId];
  if (!entrega) return notice("No encontramos esta entrega.", "bad");
  const id = esc(state.tareaId);
  return `<div class="card">
    <div class="row between"><button class="ghost" data-act="inicio">← Volver</button>${estadoChip(tarea, entrega)}</div>
    <h2>${esc(entrega.titulo || tarea?.titulo)}</h2>
    ${entregaDetalle(tarea, entrega)}
    <div class="row">
      <button class="primary" data-act="pdfPropio" data-id="${id}">Descargar PDF</button>
      ${isOpen(tarea) ? `<button data-act="resolver" data-id="${id}">Editar</button>` : ""}
    </div>
  </div>`;
}
