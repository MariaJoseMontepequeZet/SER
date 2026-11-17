import { state, isAdminMode, isBlocked, tareaById } from "../state.js";
import { esc, fmtDate, fmtDateTime, initials } from "../utils.js";
import { entregasOf, resumenDe } from "../domain.js";
import { chip, estadoChip, mutedText, notice } from "./components.js";

function statCard(label, value) {
  return `<div class="card stat"><span class="hint">${label}</span><b>${value}</b></div>`;
}

function historyItem(cuenta, tareaId, entrega) {
  const ids = `data-id="${esc(cuenta.id)}" data-tarea="${esc(tareaId)}"`;
  return `<div class="q">
    <div class="row between"><h3>${esc(entrega.titulo || tareaById(tareaId)?.titulo || "Tarea")}</h3>${estadoChip(null, entrega)}</div>
    <div class="muted small">Entregada ${fmtDateTime(entrega.enviada)}</div>
    <div class="row"><button data-act="verEntrega" ${ids}>Ver</button><button data-act="pdfEntrega" ${ids}>PDF</button></div>
  </div>`;
}

function historial(cuenta) {
  const items = Object.entries(entregasOf(cuenta)).sort(([, a], [, b]) => (b.enviada || "").localeCompare(a.enviada || ""));
  if (!items.length) return mutedText("Todavía no hay entregas.");
  return items.map(([tareaId, entrega]) => historyItem(cuenta, tareaId, entrega)).join("");
}

function adminControls(cuenta) {
  const id = esc(cuenta.id);
  const bloqueada = isBlocked(cuenta.id);
  return `<button data-act="alternarBloqueo" data-id="${id}">${bloqueada ? "Activar" : "Desactivar"}</button>
    <button class="danger" data-act="eliminarCuenta" data-id="${id}">Eliminar</button>`;
}

export function renderProfile(cuenta) {
  if (!cuenta) return notice("No encontramos este perfil.", "bad");
  const own = cuenta.id === state.userId;
  const admin = isAdminMode();
  const resumen = resumenDe(cuenta, state.tareas);
  const cuentaNombre = state.perfiles[cuenta.id]?.name;
  const back = admin ? "volverCuentas" : "inicio";

  return `<div class="card">
    <div class="row between">
      <button class="ghost" data-act="${back}">← Volver</button>
      ${admin ? (isBlocked(cuenta.id) ? chip("bad", "Desactivada") : chip("ok", "Activa")) : ""}
    </div>
    <div class="profile-head">
      <div class="avatar" aria-hidden="true">${esc(initials(cuenta.nombre))}</div>
      <div>
        <h2>${esc(cuenta.nombre || "Sin nombre")}${own && admin ? " " + chip("soft", "Vos") : ""}</h2>
        <div class="muted small">Miembro desde ${fmtDate((cuenta.creado || "").slice(0, 10))}${admin && cuentaNombre ? ` · Cuenta: ${esc(cuentaNombre)}` : ""}</div>
      </div>
    </div>
    <div class="row">
      <button data-act="renombrar" data-id="${esc(cuenta.id)}">Editar nombre</button>
      ${admin && !own ? adminControls(cuenta) : ""}
    </div>
  </div>
  <div class="stats">
    ${statCard("Entregadas", resumen.total)}
    ${statCard("A tiempo", resumen.aTiempo)}
    ${statCard("Tarde", resumen.tarde)}
    ${statCard("Pendientes", resumen.pendientes)}
  </div>
  <div class="card"><h2>Historial de entregas</h2>${historial(cuenta)}</div>`;
}
