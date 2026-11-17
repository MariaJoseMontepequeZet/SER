import { state } from "./state.js";
import { entregaPayload, entregasOf, tareaPayload } from "./domain.js";

export class ConnectionError extends Error {}

const MESSAGES = {
  runtime: "Esta página tiene que abrirse desde claude.ai con tu cuenta iniciada.",
  connection:
    "No se pudo conectar. Asegurate de haber iniciado sesión en Claude y de que la admin te haya compartido la página con permiso de Colaborador (Contributor).",
  identity: "No pudimos identificar tu cuenta. Iniciá sesión en Claude y volvé a abrir el enlace.",
  revoked: "Ya no tenés acceso a esta página.",
};

const fail = (code) => {
  throw new ConnectionError(MESSAGES[code]);
};

const cuentaRef = (id) => state.db.doc(`cuentas/${id}`);
const byText = (key) => (a, b) => (a[key] || "").localeCompare(b[key] || "", "es");
const withId = (doc) => ({ id: doc.id, ...doc.data() });

export const revokedMessage = () => MESSAGES.revoked;

export async function connect() {
  if (!window.claude?.use) fail("runtime");
  const [db, user, downloads] = await Promise.all([
    window.claude.use("db"),
    window.claude.use("user"),
    window.claude.use("downloads"),
  ]);
  if (!db || !user) fail("connection");

  const userId = await user.id();
  if (!userId) fail("identity");

  let isAdmin = false;
  try {
    isAdmin = Boolean(await user.canEdit());
  } catch {
    isAdmin = false;
  }
  Object.assign(state, { db, user, downloads, userId, isAdmin });
}

export function watch({ onChange, onSynced, onError }) {
  const settle = (snapshot) => {
    if (!snapshot.metadata.fromCache) onSynced();
  };
  const ignore = () => {};

  state.db.collection("tareas").onSnapshot((snapshot) => {
    state.tareas = snapshot.docs.map(withId).sort((a, b) => (b.creada || "").localeCompare(a.creada || ""));
    state.tareasLoaded = true;
    settle(snapshot);
    onChange();
  }, onError);

  cuentaRef(state.userId).onSnapshot((snapshot) => {
    state.cuenta = snapshot.exists ? withId(snapshot) : null;
    settle(snapshot);
    onChange();
  }, onError);

  state.db.doc("config/bloqueos").onSnapshot((snapshot) => {
    state.bloqueos = (snapshot.exists && snapshot.data().ids) || {};
    onChange();
  }, ignore);

  if (!state.isAdmin) return;
  state.db.collection("cuentas").onSnapshot(async (snapshot) => {
    state.cuentas = snapshot.docs.map(withId).sort(byText("nombre"));
    try {
      state.perfiles = (await state.user.profiles(state.cuentas.map((cuenta) => cuenta.id))) || {};
    } catch {
      state.perfiles = {};
    }
    onChange();
  }, ignore);
}

export const registrarCuenta = (nombre) =>
  cuentaRef(state.userId).set({ nombre, creado: new Date().toISOString(), entregas: {} });

export const renombrarCuenta = (id, nombre) => cuentaRef(id).update({ nombre });

export const eliminarCuenta = (id) => cuentaRef(id).delete();

export function guardarEntrega(tarea, form) {
  const previa = entregasOf(state.cuenta)[tarea.id];
  const entrega = entregaPayload(tarea, form, previa);
  return cuentaRef(state.userId)
    .update({ entregas: { ...entregasOf(state.cuenta), [tarea.id]: entrega } })
    .then(() => ({ entrega, editada: Boolean(previa) }));
}

export function guardarTarea(draft) {
  const ref = draft.id ? state.db.doc(`tareas/${draft.id}`) : state.db.collection("tareas").doc();
  return ref.set(tareaPayload(draft));
}

export const cambiarActiva = (id, activa) => state.db.doc(`tareas/${id}`).update({ activa });

export const eliminarTarea = (id) => state.db.doc(`tareas/${id}`).delete();

export async function cambiarBloqueo(id) {
  const ids = { ...state.bloqueos };
  if (ids[id]) delete ids[id];
  else ids[id] = true;
  await state.db.doc("config/bloqueos").set({ ids });
  return Boolean(ids[id]);
}
