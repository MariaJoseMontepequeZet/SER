import { adminEmails, firebaseConfig } from "../firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";

export const isConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const wrapDoc = (snapshot) => ({
  exists: snapshot.exists(),
  id: snapshot.id,
  data: () => snapshot.data(),
  metadata: snapshot.metadata,
});

const wrapCollection = (snapshot) => ({
  docs: snapshot.docs.map((doc) => ({ id: doc.id, data: () => doc.data() })),
  metadata: snapshot.metadata,
});

function waitForLogin(auth, { GoogleAuthProvider, signInWithPopup }) {
  const root = document.getElementById("app");
  root.innerHTML = `<div class="card">
    <h2>Buzón de Tareas</h2>
    <p class="muted flush">Iniciá sesión con tu cuenta de Google para continuar.</p>
    <p class="notice bad" id="loginError" hidden></p>
    <div class="row"><button class="primary" id="loginButton" type="button">Entrar con Google</button></div>
  </div>`;

  return new Promise((resolve) => {
    root.querySelector("#loginButton").addEventListener("click", async () => {
      try {
        resolve((await signInWithPopup(auth, new GoogleAuthProvider())).user);
      } catch {
        const message = root.querySelector("#loginError");
        message.textContent = "No se pudo iniciar sesión. Intentá de nuevo.";
        message.hidden = false;
      }
    });
  });
}

function currentUser(auth, authApi) {
  return new Promise((resolve) => {
    const stop = authApi.onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    });
  }).then((user) => user ?? waitForLogin(auth, authApi));
}

export async function createRuntime() {
  const [{ initializeApp }, authApi, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const firestore = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache(),
  });
  const user = await currentUser(auth, authApi);

  const docRef = (path) => fs.doc(firestore, path);
  const observe = (ref, wrap) => (onNext, onError) =>
    fs.onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => onNext(wrap(snapshot)), onError);

  const wrapRef = (path) => {
    const ref = docRef(path);
    return {
      id: ref.id,
      onSnapshot: observe(ref, wrapDoc),
      set: (value) => fs.setDoc(ref, value),
      update: (value) => fs.updateDoc(ref, value),
      delete: () => fs.deleteDoc(ref),
    };
  };

  const db = {
    doc: wrapRef,
    collection: (name) => {
      const ref = fs.collection(firestore, name);
      return {
        onSnapshot: observe(ref, wrapCollection),
        doc: (id) => wrapRef(`${name}/${id ?? fs.doc(ref).id}`),
      };
    },
  };

  const email = (user.email || "").toLowerCase();
  const admins = adminEmails.map((item) => item.toLowerCase());

  return {
    db,
    user: {
      id: async () => user.uid,
      canEdit: async () => admins.includes(email),
      profiles: async (ids) => Object.fromEntries(ids.map((id) => [id, id === user.uid ? { name: user.email } : {}])),
    },
    downloads: {
      save: async ({ filename, data }) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(data);
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      },
    },
    signOut: () => authApi.signOut(auth),
  };
}
