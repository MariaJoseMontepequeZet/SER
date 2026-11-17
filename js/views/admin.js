import { state, tareaById, isBlocked, entregasDeTarea, cuentaDe } from "../state.js";
import { esc, fmtDate, fmtDateTime } from "../utils.js";
import { entregasOf } from "../domain.js";
import { chip, mutedText, pluralize } from "./components.js";
import { renderEditor } from "./editor.js";
import { renderProfile } from "./profile.js";

const TABS = [
  ["tareas", "Tareas"],
  ["entregas", "Entregas"],
  ["cuentas", "Cuentas"],
];

export function renderAdmin() {
  if (state.view === "editor") return renderEditor();
  if (state.view === "profile") return renderProfile(cuentaDe(state.perfilId));

  const tabs = TABS.map(
    ([key, label]) =>
      `<button role="tab" id="tab-${key}" aria-controls="panel-${key}" aria-selected="${state.tab === key}" data-act="pestana" data-id="${key}">${label}</button>`,
  ).join("");
  const panels = { tareas: tabTareas, entregas: tabEntregas, cuentas: tabCuentas };

  const activas = state.cuentas.filter((cuenta) => !isBlocked(cuenta.id)).length;
  const totalEntregas = state.cuentas.reduce((sum, cuenta) => sum + Object.keys(entregasOf(cuenta)).length, 0);

  return `<div class="stats">
    <div class="card stat"><span class="hint">Tareas</span><b>${state.tareas.length}</b></div>
    <div class="card stat"><span class="hint">Cuentas activas</span><b>${activas}</b></div>
    <div class="card stat"><span class="hint">Entregas recibidas</span><b>${totalEntregas}</b></div>
  </div>
  <div class="card"><div class="tabs" role="tablist" aria-label="Secciones">${tabs}</div>
    <div role="tabpanel" id="panel-${state.tab}" aria-labelledby="tab-${state.tab}" class="panel">${panels[state.tab]()}</div></div>`;
}

function tareaItem(tarea) {
  const id = esc(tarea.id);
  const entregas = entregasDeTarea(tarea.id).length;
  return `<div class="q">
    <div class="row between"><h3>${esc(tarea.titulo)}</h3>${chip(tarea.activa ? "ok" : "bad", tarea.activa ? "Activa" : "Cerrada")}</div>
    <div class="muted small">Fecha límite ${fmtDate(tarea.fechaLimite)} · ${(tarea.preguntas || []).length} preguntas · ${pluralize(entregas, "entrega", "entregas")}</div>
    <div class="row">
      <button data-act="verEntregas" data-id="${id}">Ver entregas</button>
      <button data-act="editarTarea" data-id="${id}">Editar</button>
      <button data-act="alternarActiva" data-id="${id}">${tarea.activa ? "Cerrar" : "Reabrir"}</button>
      <button data-act="duplicarTarea" data-id="${id}">Duplicar</button>
      <button class="danger" data-act="eliminarTarea" data-id="${id}">Eliminar</button>
    </div>
  </div>`;
}

function tabTareas() {
  const lista = state.tareas.map(tareaItem).join("");
  return `<div class="row between"><h2>Tareas</h2><button class="primary" data-act="nuevaTarea">+ Nueva tarea</button></div>
    ${lista || mutedText('No hay tareas todavía. Creá la primera con "Nueva tarea".')}`;
}

function entregaRow({ cuenta, entrega }, tareaId) {
  const ids = `data-id="${esc(cuenta.id)}" data-tarea="${esc(tareaId)}"`;
  return `<tr>
    <td><strong>${esc(entrega.nombre)}</strong></td>
    <td class="num">${fmtDate(entrega.fecha)}</td>
    <td class="num hide-sm">${fmtDateTime(entrega.enviada)}</td>
    <td>${entrega.tarde ? chip("warn", "Tarde") : chip("ok", "A tiempo")}</td>
    <td><div class="row"><button data-act="verEntrega" ${ids}>Ver</button><button data-act="pdfEntrega" ${ids}>PDF</button></div></td>
  </tr>`;
}

function tabEntregas() {
  if (!state.tareas.length) return mutedText("Creá una tarea primero.");
  if (!tareaById(state.tareaId)) state.tareaId = state.tareas[0].id;

  const tarea = tareaById(state.tareaId);
  const entregas = entregasDeTarea(tarea.id);
  const pendientes = state.cuentas.filter((cuenta) => !isBlocked(cuenta.id) && !entregasOf(cuenta)[tarea.id]);
  const opciones = state.tareas
    .map((item) => `<option value="${esc(item.id)}" ${item.id === tarea.id ? "selected" : ""}>${esc(item.titulo)}</option>`)
    .join("");

  const tabla = entregas.length
    ? `<div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Fecha</th><th class="hide-sm">Enviada</th><th>Estado</th><th></th></tr></thead>
        <tbody>${entregas.map((item) => entregaRow(item, tarea.id)).join("")}</tbody>
      </table></div>`
    : mutedText("Nadie ha entregado esta tarea todavía.");

  const faltantes = pendientes.length
    ? `<div class="field"><span class="hint">Pendientes</span>
        <div class="row">${pendientes.map((cuenta) => chip("warn", cuenta.nombre || "Sin nombre")).join("")}</div></div>`
    : "";

  return `<div class="field"><label for="selTarea">Tarea</label><select id="selTarea">${opciones}</select></div>
    <div class="row between">
      <div class="muted">${entregas.length} entregadas · ${pendientes.length} pendientes</div>
      <button class="primary" data-act="pdfTodas" ${entregas.length ? "" : "disabled"}>Descargar todas en PDF</button>
    </div>
    ${tabla}${faltantes}`;
}

function cuentaRow(cuenta) {
  const perfil = state.perfiles[cuenta.id] || {};
  const bloqueada = isBlocked(cuenta.id);
  const id = esc(cuenta.id);
  return `<tr>
    <td><strong>${esc(cuenta.nombre || "Sin nombre")}</strong>${cuenta.id === state.userId ? " " + chip("soft", "Vos") : ""}
      <div class="hint">Cuenta: ${esc(perfil.name || "—")}${perfil.guest ? " (externa)" : ""}</div></td>
    <td class="num">${Object.keys(entregasOf(cuenta)).length}</td>
    <td class="hide-sm num">${fmtDateTime(cuenta.creado)}</td>
    <td>${bloqueada ? chip("bad", "Desactivada") : chip("ok", "Activa")}</td>
    <td><div class="row">
      <button data-act="perfil" data-id="${id}">Ver perfil</button>
      <button data-act="alternarBloqueo" data-id="${id}">${bloqueada ? "Activar" : "Desactivar"}</button>
      <button class="danger" data-act="eliminarCuenta" data-id="${id}">Eliminar</button>
    </div></td>
  </tr>`;
}

function tabCuentas() {
  if (!state.cuentas.length) {
    return `<h2>Cuentas</h2>${mutedText("Nadie se ha registrado todavía. Compartí el enlace de esta página con tu grupo.")}`;
  }
  return `<h2>Cuentas</h2>
    <p class="hint flush">Cada estudiante se registra solo al abrir la página. Desde aquí podés abrir cada perfil, desactivar o eliminar cuentas.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Estudiante</th><th>Entregas</th><th class="hide-sm">Registro</th><th>Estado</th><th></th></tr></thead>
      <tbody>${state.cuentas.map(cuentaRow).join("")}</tbody>
    </table></div>`;
}
