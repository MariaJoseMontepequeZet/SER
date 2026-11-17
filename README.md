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
js/ui.js            Avisos y diálogos
js/utils.js         Utilidades puras
js/views/           Vistas: student, admin, editor, profile, components
```

## Desarrollo

Es una página estática con módulos ES, sin paso de compilación. Para verla en local sirve la carpeta con cualquier servidor estático; el runtime `window.claude` solo existe dentro de claude.ai, por lo que fuera de ahí hace falta simularlo.

## Flujo de trabajo

Los cambios se hacen en ramas (`feat/`, `fix/`, `refactor/`, `chore/`) y se integran a `main` con merge.
