import { tomorrowStr } from "./utils.js";
import { draftFrom, newPregunta } from "./domain.js";

const pregunta = (label, ayuda, tipo = "larga", requerida = true) => ({ ...newPregunta(), label, ayuda, tipo, requerida });

export const plantillas = [
  {
    nombre: "El profesional que quiero ser",
    crear: () => ({
      ...draftFrom(null),
      titulo: "El profesional que quiero ser",
      instrucciones:
        "Respondé con honestidad y con ejemplos concretos. Esta tarea no se califica por lo \"bonito\" de la respuesta, sino por qué tan real es: sirve para verte hoy, decidir hacia dónde ir y empezar a mejorar.",
      fechaLimite: tomorrowStr(),
      horaLimite: "11:30",
      cierreAutomatico: true,
      activa: true,
      preguntas: [
        pregunta(
          "¿Dónde estoy ahorita realmente como profesional?",
          "Tus fortalezas, tus debilidades y lo que hoy sabés hacer, sin adornos.",
        ),
        pregunta(
          "¿Hasta dónde quiero llegar realmente?",
          "Describí el puesto, el tipo de trabajo o el impacto que querés tener dentro de 5 años.",
        ),
        pregunta(
          "¿Qué tipo de profesional NO quiero ser?",
          "Actitudes, hábitos o formas de trabajar que no querés repetir. Puede ser algo que viste en otras personas o en vos mismo/a.",
        ),
        pregunta(
          "¿Qué voy a hacer para no convertirme en eso?",
          "Dos o tres acciones concretas que podés aplicar desde ahora.",
        ),
        pregunta(
          "¿Qué me deja con ganas de mejorar después de reflexionar esto?",
          "Elegí una cosa y un primer paso que harías esta semana.",
        ),
        pregunta(
          "Para la dinámica: ¿cómo te reconocerían tus compañeros como profesional?",
          "Una frase con el rol que querés tener y una cualidad que te define.",
          "corta",
        ),
      ],
    }),
  },
];
