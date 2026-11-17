import { entregasOf } from "./domain.js";

export const state = {
  db: null,
  user: null,
  downloads: null,
  signOut: null,
  userId: null,
  isAdmin: false,
  asStudent: false,
  tareas: [],
  tareasLoaded: false,
  cuenta: undefined,
  cuentas: [],
  perfiles: {},
  bloqueos: {},
  view: "home",
  tab: "tareas",
  tareaId: null,
  perfilId: null,
  editing: false,
  draft: null,
  form: null,
  slow: false,
  fatal: null,
};

export const isAdminMode = () => state.isAdmin && !state.asStudent;
export const tareaById = (id) => state.tareas.find((tarea) => tarea.id === id);
export const cuentaById = (id) => state.cuentas.find((cuenta) => cuenta.id === id);
export const cuentaDe = (id) => (id === state.userId ? state.cuenta : cuentaById(id));
export const isBlocked = (id) => Boolean(state.bloqueos[id]);

export function entregasDeTarea(tareaId) {
  return state.cuentas
    .filter((cuenta) => entregasOf(cuenta)[tareaId])
    .map((cuenta) => ({ cuenta, entrega: cuenta.entregas[tareaId] }))
    .sort((a, b) => (a.entrega.nombre || "").localeCompare(b.entrega.nombre || "", "es"));
}

export function goTo(view, extra = {}) {
  state.view = view;
  Object.assign(state, extra);
}
