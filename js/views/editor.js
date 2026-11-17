import { state } from "../state.js";
import { esc } from "../utils.js";
import { chip } from "./components.js";

function preguntaEditor(pregunta, n, total) {
  return `<div class="q">
    <div class="row between">
      <strong>Pregunta ${n + 1}</strong>
      <div class="row">
        <button type="button" class="ghost" data-act="subirPregunta" data-id="${n}" aria-label="Subir" ${n === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="ghost" data-act="bajarPregunta" data-id="${n}" aria-label="Bajar" ${n === total - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="ghost danger" data-act="quitarPregunta" data-id="${n}">Quitar</button>
      </div>
    </div>
    <div class="field"><label for="ql_${n}">Pregunta</label><input type="text" id="ql_${n}" data-d="label" data-i="${n}" value="${esc(pregunta.label)}"></div>
    <div class="field"><label for="qa_${n}">Ayuda o ejemplo <span class="hint">(opcional)</span></label><input type="text" id="qa_${n}" data-d="ayuda" data-i="${n}" value="${esc(pregunta.ayuda || "")}"></div>
    <div class="row">
      <select id="qt_${n}" class="auto" data-d="tipo" data-i="${n}" aria-label="Tipo de respuesta">
        <option value="larga" ${pregunta.tipo !== "corta" ? "selected" : ""}>Respuesta larga</option>
        <option value="corta" ${pregunta.tipo === "corta" ? "selected" : ""}>Respuesta corta</option>
      </select>
      <label class="switch"><input type="checkbox" id="qr_${n}" data-d="requerida" data-i="${n}" ${pregunta.requerida ? "checked" : ""}> Obligatoria</label>
    </div>
  </div>`;
}

export function renderEditor() {
  const draft = state.draft;
  const preguntas = draft.preguntas.map((pregunta, index) => preguntaEditor(pregunta, index, draft.preguntas.length)).join("");

  return `<form class="card" id="editForm">
    <div class="row between">
      <button type="button" class="ghost" data-act="cancelarEdicion">← Volver</button>
      ${chip("soft", draft.nuevo ? "Nueva tarea" : "Editando")}
    </div>
    <div class="field"><label for="eTitulo">Título</label><input type="text" id="eTitulo" data-d="titulo" value="${esc(draft.titulo)}" required></div>
    <div class="field"><label for="eInstr">Instrucciones</label><textarea id="eInstr" data-d="instrucciones">${esc(draft.instrucciones)}</textarea></div>
    <div class="row">
      <div class="field grow"><label for="eFecha">Fecha límite</label><input type="date" id="eFecha" data-d="fechaLimite" value="${esc(draft.fechaLimite)}"></div>
      <label class="switch"><input type="checkbox" id="eActiva" data-d="activa" ${draft.activa ? "checked" : ""}> Visible para estudiantes</label>
    </div>
    <p class="hint flush">El nombre completo y la fecha se piden siempre. Aquí armás las preguntas de la resolución.</p>
    ${preguntas}
    <div class="row"><button type="button" data-act="agregarPregunta">+ Agregar pregunta</button></div>
    <div class="row">
      <button class="primary" type="submit">Guardar tarea</button>
      <button type="button" data-act="cancelarEdicion">Cancelar</button>
    </div>
  </form>`;
}
