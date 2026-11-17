import { state, isAdminMode } from "./state.js";
import { esc } from "./utils.js";
import { mutedCard, notice } from "./views/components.js";
import { renderAdmin } from "./views/admin.js";
import { renderStudent } from "./views/student.js";

const root = document.getElementById("app");

function header() {
  const nombre = state.cuenta?.nombre ?? "";
  const subtitle = isAdminMode() ? "Panel de administración" : nombre ? esc(nombre) : "Tus tareas del grupo";
  const switcher = state.isAdmin
    ? `<label class="switch"><input type="checkbox" id="asStudent" ${state.asStudent ? "checked" : ""}> Ver como estudiante</label>`
    : "";
  return `<header class="top">
    <div class="brand">
      <div class="logo" aria-hidden="true">B</div>
      <div><h1>Buzón de Tareas</h1><small>${subtitle}</small></div>
    </div>${switcher}
  </header>`;
}

function body() {
  if (state.fatal) return notice(state.fatal, "bad");
  if (!state.db || (!state.tareasLoaded && state.cuenta === undefined)) {
    return mutedCard(
      state.slow
        ? "La conexión está tardando. Revisá tu internet; la página sigue intentando."
        : "Cargando tus tareas…",
    );
  }
  const content = isAdminMode() ? renderAdmin() : renderStudent();
  return state.slow ? notice("Puede que los datos no estén al día; seguimos intentando conectar.") + content : content;
}

export function render() {
  root.innerHTML = header() + body();
}

export function rerender() {
  if (!state.editing) render();
}
