# Buzón de Tareas

Página para que un grupo entregue tareas y la administración las revise y descargue en PDF. Se publica como artefacto de claude.ai y usa sus servicios de base de datos, usuario y descargas (`claude.use("db" | "user" | "downloads")`).

## Perfiles

Cada persona se registra al abrir la página y tiene su propio perfil (`cuentas/{id}`) con su nombre, resumen de entregas (a tiempo, tarde, pendientes) e historial con acceso al detalle y al PDF. La administración puede abrir el perfil de cada cuenta, desactivarla o eliminarla.

## Estructura

```
index.html          Documento base
css/styles.css      Estilos y temas claro/oscuro
js/main.js          Arranque y conexión
js/app.js           Render del encabezado y de la vista activa
js/actions.js       Eventos y acciones de la interfaz
js/state.js         Estado compartido y selectores
js/data.js          Acceso a la base de datos
js/domain.js        Reglas de tareas y entregas
js/pdf.js           Generación de PDF
js/backend/         Servicio Firebase para uso fuera de claude.ai
js/firebase-config.js  Configuración de Firebase y correos admin
firestore.rules     Reglas de seguridad de Firestore
dev/                Simulación local para Live Server
js/ui.js            Avisos y diálogos
js/utils.js         Utilidades puras
js/views/           Vistas: student, admin, editor, profile, components
```

## Desarrollo

Es una página estática con módulos ES, sin paso de compilación. Con la extensión Live Server de VS Code, abrí `index.html` con "Open with Live Server".

Fuera de claude.ai no existe `window.claude`, así que en `localhost` se carga `dev/mock-claude.js`, que simula la base de datos, el usuario y las descargas guardando los datos en `localStorage`. No hace nada en otros dominios.

- `index.html`: entras como estudiante.
- `index.html?admin=1`: entras como administración.
- `index.html?user=ana`: entras como otra persona, con su propio perfil.

## Publicar en GitHub Pages (Firebase)

Fuera de claude.ai la página usa Firebase (Authentication con Google y Firestore). Pasos únicos:

1. En https://console.firebase.google.com crea un proyecto.
2. Authentication → Sign-in method → habilita Google.
3. Firestore Database → crea la base de datos en modo producción.
4. Firestore → Rules: pega el contenido de `firestore.rules`, cambiando el correo de la administración.
5. Project settings → Your apps → Web (`</>`): copia la configuración a `js/firebase-config.js` y escribe el correo de la administración en `adminEmails`.
6. Authentication → Settings → Authorized domains: agrega `TU_USUARIO.github.io`.
7. Haz commit y push a `main`; Pages sirve el sitio.

La administración se decide por correo: quien esté en `adminEmails` (y en las reglas) ve el panel; el resto entra como estudiante con su propio perfil.

## Flujo de trabajo

Los cambios se hacen en ramas (`feat/`, `fix/`, `refactor/`, `chore/`) y se integran a `main` con merge.
