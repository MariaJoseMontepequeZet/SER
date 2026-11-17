import { state, goTo, tareaById, cuentaById, cuentaDe, entregasDeTarea } from "./state.js";
import { esc, slug } from "./utils.js";
import { draftFrom, entregasOf, isOpen, newPregunta } from "./domain.js";
import { plantillas } from "./plantillas.js";
import * as data from "./data.js";
import { downloadPdf, PdfUnavailableError } from "./pdf.js";
import { confirmBox, openModal, toast } from "./ui.js";
import { render } from "./app.js";
import { initialForm } from "./views/student.js";
import { entregaDetalle } from "./views/components.js";

const scrollTop = () => window.scrollTo(0, 0);

async function attempt(task, failure) {
  try {
    await task();
    return true;
  } catch {
    toast(failure);
    return false;
  }
}

async function savePdf(items, filename) {
  try {
    await downloadPdf(state.downloads, items, filename);
  } catch (error) {
    if (error?.code === "declined") return;
    toast(error instanceof PdfUnavailableError ? error.message : "No se pudo descargar el PDF.");
  }
}

const pdfName = (tarea, entrega) => `${slug(tarea?.titulo ?? entrega.titulo)}-${slug(entrega.nombre)}.pdf`;

function leaveEditing() {
  state.editing = false;
  state.draft = null;
  state.form = null;
  goTo("home");
  render();
}

function openRenameModal(cuentaId) {
  const cuenta = cuentaDe(cuentaId);
  openModal({
    title: cuentaId === state.userId ? "Editar mi nombre" : "Editar nombre",
    body: `<div class="field"><label for="mNombre">Nombre completo</label><input type="text" id="mNombre" value="${esc(cuenta?.nombre)}"></div>`,
    actions: [
      { label: "Cancelar" },
      {
        label: "Guardar",
        kind: "primary",
        run: async (modal) => {
          const nombre = modal.querySelector("#mNombre").value.trim();
          if (!nombre) return false;
          await attempt(() => data.renombrarCuenta(cuentaId, nombre), "No se pudo guardar.");
        },
      },
    ],
  });
}

function movePregunta(index, delta) {
  const list = state.draft.preguntas;
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  render();
}

const clicks = {
  async salir() {
    await state.signOut();
    location.reload();
  },
  inicio() {
    state.editing = false;
    state.form = null;
    goTo("home");
    render();
  },
  resolver({ id }) {
    const tarea = tareaById(id);
    if (!tarea) return;
    if (!isOpen(tarea)) return toast("Esta tarea ya está cerrada.");
    state.form = initialForm(state.cuenta, id);
    state.editing = true;
    goTo("form", { tareaId: id });
    render();
    scrollTop();
  },
  ver({ id }) {
    goTo("ver", { tareaId: id });
    render();
    scrollTop();
  },
  pdfPropio({ id }) {
    const entrega = entregasOf(state.cuenta)[id];
    if (entrega) savePdf([{ tarea: tareaById(id), entrega }], pdfName(tareaById(id), entrega));
  },
  perfil({ id }) {
    goTo("profile", { perfilId: id });
    render();
    scrollTop();
  },
  volverCuentas() {
    state.tab = "cuentas";
    goTo("home");
    render();
  },
  renombrar({ id }) {
    openRenameModal(id);
  },
  pestana({ id }) {
    state.tab = id;
    render();
  },
  plantillas() {
    openModal({
      title: "Plantillas",
      body: '<p class="flush">Elegí una plantilla para crear la tarea con las preguntas ya armadas. Podés editarla antes de guardar.</p>',
      actions: [
        { label: "Cancelar" },
        ...plantillas.map((plantilla) => ({
          label: plantilla.nombre,
          kind: "primary",
          run: () => startEditor(plantilla.crear()),
        })),
      ],
    });
  },
  nuevaTarea() {
    startEditor(draftFrom(null));
  },
  editarTarea({ id }) {
    startEditor(draftFrom(tareaById(id)));
  },
  duplicarTarea({ id }) {
    startEditor(draftFrom(tareaById(id), { copy: true }));
  },
  cancelarEdicion: leaveEditing,
  agregarPregunta() {
    state.draft.preguntas.push(newPregunta());
    render();
  },
  quitarPregunta({ id }) {
    state.draft.preguntas.splice(Number(id), 1);
    render();
  },
  subirPregunta({ id }) {
    movePregunta(Number(id), -1);
  },
  bajarPregunta({ id }) {
    movePregunta(Number(id), 1);
  },
  alternarActiva({ id }) {
    return attempt(() => data.cambiarActiva(id, !tareaById(id).activa), "No se pudo cambiar.");
  },
  eliminarTarea({ id }) {
    const tarea = tareaById(id);
    confirmBox({
      title: "Eliminar tarea",
      text: `Se eliminará "${tarea.titulo}". Las entregas que ya hicieron se conservan en cada cuenta.`,
      label: "Eliminar",
      run: async () => {
        if (await attempt(() => data.eliminarTarea(id), "No se pudo eliminar.")) toast("Tarea eliminada");
      },
    });
  },
  verEntregas({ id }) {
    state.tab = "entregas";
    state.tareaId = id;
    render();
  },
  verEntrega({ id, tarea: tareaId }) {
    const tarea = tareaById(tareaId);
    const entrega = entregasOf(cuentaDe(id))[tareaId];
    openModal({
      title: entrega.titulo || tarea?.titulo,
      body: entregaDetalle(tarea, entrega),
      actions: [
        { label: "Cerrar" },
        { label: "Descargar PDF", kind: "primary", run: () => savePdf([{ tarea, entrega }], pdfName(tarea, entrega)) },
      ],
    });
  },
  pdfEntrega({ id, tarea: tareaId }) {
    const tarea = tareaById(tareaId);
    const entrega = entregasOf(cuentaDe(id))[tareaId];
    return savePdf([{ tarea, entrega }], pdfName(tarea, entrega));
  },
  pdfTodas() {
    const tarea = tareaById(state.tareaId);
    const items = entregasDeTarea(tarea.id).map(({ entrega }) => ({ tarea, entrega }));
    return savePdf(items, `${slug(tarea.titulo)}-todas.pdf`);
  },
  async alternarBloqueo({ id }) {
    try {
      const bloqueada = await data.cambiarBloqueo(id);
      toast(bloqueada ? "Cuenta desactivada" : "Cuenta activada");
    } catch {
      toast("No se pudo cambiar el estado.");
    }
  },
  eliminarCuenta({ id }) {
    const cuenta = cuentaById(id);
    confirmBox({
      title: "Eliminar cuenta",
      text: `Se borrará el perfil de ${cuenta.nombre || "esta persona"} y todas sus entregas. No se puede deshacer.`,
      label: "Eliminar",
      run: async () => {
        if (!(await attempt(() => data.eliminarCuenta(id), "No se pudo eliminar."))) return;
        toast("Cuenta eliminada");
        if (state.view === "profile") clicks.volverCuentas();
      },
    });
  },
};

function startEditor(draft) {
  state.draft = draft;
  state.editing = true;
  goTo("editor");
  render();
  scrollTop();
}

const submits = {
  async regForm(form) {
    const nombre = form.querySelector("#regNombre").value.trim();
    if (nombre.split(/\s+/).length < 2) return toast("Escribí tu nombre y apellido.");
    try {
      await data.registrarCuenta(nombre);
      toast("¡Listo, perfil creado!");
    } catch (error) {
      toast(
        ["invalid_argument", "permission-denied"].includes(error?.code)
          ? "No tenés permiso para registrarte. Pedile a la admin acceso de Colaborador."
          : "No se pudo guardar. Intentá de nuevo.",
      );
    }
  },

  async entForm() {
    const tarea = tareaById(state.tareaId);
    const { form } = state;
    if (!isOpen(tarea)) return toast("La tarea ya cerró y no recibe más entregas.");
    if (!form.nombre.trim()) return toast("Falta tu nombre completo.");
    if (!form.fecha) return toast("Falta la fecha.");
    const faltante = (tarea.preguntas || []).find(
      (pregunta) => pregunta.requerida && !String(form.respuestas[pregunta.id] || "").trim(),
    );
    if (faltante) {
      toast(`Falta responder: ${faltante.label}`);
      document.getElementById(`q_${faltante.id}`)?.focus();
      return;
    }

    const button = document.getElementById("btnEnviar");
    button.disabled = true;
    try {
      const { editada } = await data.guardarEntrega(tarea, form);
      state.editing = false;
      goTo("ver");
      render();
      toast(editada ? "Cambios guardados" : "¡Tarea entregada!");
    } catch {
      button.disabled = false;
      toast("No se pudo entregar. Revisá tu conexión e intentá otra vez.");
    }
  },

  async editForm() {
    const { draft } = state;
    if (!draft.titulo.trim()) return toast("La tarea necesita un título.");
    if (!draft.preguntas.some((pregunta) => pregunta.label.trim())) return toast("Agregá al menos una pregunta.");
    try {
      await data.guardarTarea(draft);
      toast("Tarea guardada");
      state.tab = "tareas";
      leaveEditing();
    } catch {
      toast("No se pudo guardar la tarea.");
    }
  },
};

function applyDraftField(element) {
  const value = element.type === "checkbox" ? element.checked : element.value;
  const { d: field, i: index } = element.dataset;
  if (index !== undefined) state.draft.preguntas[Number(index)][field] = value;
  else state.draft[field] = value;
}

export function bindEvents(root) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    const handler = button && clicks[button.dataset.act];
    if (handler) handler(button.dataset);
  });

  root.addEventListener("input", (event) => {
    const element = event.target;
    if (state.view === "form" && state.form) {
      if (element.dataset.q) state.form.respuestas[element.dataset.q] = element.value;
      if (element.id === "fNombre") state.form.nombre = element.value;
      if (element.id === "fFecha") state.form.fecha = element.value;
    }
    if (state.view === "editor" && state.draft && element.dataset.d) applyDraftField(element);
  });

  root.addEventListener("change", (event) => {
    const element = event.target;
    if (element.id === "asStudent") {
      state.asStudent = element.checked;
      state.editing = false;
      goTo("home");
      render();
      return;
    }
    if (element.id === "selTarea") {
      state.tareaId = element.value;
      render();
      return;
    }
    if (state.view === "editor" && state.draft && element.dataset.d && element.tagName === "SELECT") {
      applyDraftField(element);
    }
  });

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    submits[event.target.id]?.(event.target);
  });
}
