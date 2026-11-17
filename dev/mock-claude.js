(() => {
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (window.claude || !isLocal) return;

  const STORAGE_KEY = "ser-dev-db";
  const params = new URLSearchParams(location.search);
  const userId = params.get("user") || "yo";
  const isAdmin = params.get("admin") === "1";

  const seed = () => ({
    "tareas/demo": {
      titulo: "Tarea de ejemplo",
      instrucciones: "Respondé las preguntas con tus propias palabras.",
      fechaLimite: "",
      activa: true,
      creada: new Date().toISOString(),
      preguntas: [
        { id: "p1", label: "¿Qué aprendiste esta semana?", ayuda: "", tipo: "larga", requerida: true },
        { id: "p2", label: "¿Tenés alguna duda?", ayuda: "Opcional", tipo: "corta", requerida: false },
      ],
    },
  });

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seed();
    } catch {
      return seed();
    }
  };
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

  let store = load();
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    store = load();
    notify();
  });

  const collectionSnapshot = (name) => ({
    docs: Object.entries(store)
      .filter(([path]) => path.startsWith(`${name}/`))
      .map(([path, value]) => ({ id: path.slice(name.length + 1), data: () => value })),
    metadata: { fromCache: false },
  });
  const docSnapshot = (path) => ({
    exists: path in store,
    id: path.split("/").pop(),
    data: () => store[path],
    metadata: { fromCache: false },
  });
  const subscribe = (read) => (callback) => {
    const listener = () => callback(read());
    listeners.add(listener);
    setTimeout(listener);
    return () => listeners.delete(listener);
  };
  const write = (path, value) => {
    if (value === undefined) delete store[path];
    else store[path] = value;
    save();
    notify();
  };

  const docRef = (path) => ({
    id: path.split("/").pop(),
    onSnapshot: subscribe(() => docSnapshot(path)),
    set: async (value) => write(path, value),
    update: async (value) => write(path, { ...store[path], ...value }),
    delete: async () => write(path, undefined),
  });

  const db = {
    doc: docRef,
    collection: (name) => ({
      onSnapshot: subscribe(() => collectionSnapshot(name)),
      doc: (id = crypto.randomUUID().slice(0, 8)) => docRef(`${name}/${id}`),
    }),
  };

  const user = {
    id: async () => userId,
    canEdit: async () => isAdmin,
    profiles: async (ids) => Object.fromEntries(ids.map((id) => [id, { name: id }])),
  };

  const downloads = {
    save: async ({ filename, data }) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(data);
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },
  };

  window.claude = { use: async (service) => ({ db, user, downloads })[service] };
})();
