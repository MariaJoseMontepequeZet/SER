import { esc } from "./utils.js";

const TOAST_MS = 2800;
let lastFocus = null;

export function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), TOAST_MS);
}

const modalRoot = () => document.getElementById("modal-root");

export function closeModal() {
  modalRoot().innerHTML = "";
  document.removeEventListener("keydown", onEscape);
  lastFocus?.focus?.();
  lastFocus = null;
}

function onEscape(event) {
  if (event.key === "Escape") closeModal();
}

export function openModal({ title, body, actions = [{ label: "Cerrar" }] }) {
  const root = modalRoot();
  lastFocus = document.activeElement;
  root.innerHTML = `<div class="modal-back" data-close="1">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${esc(title)}</h2>
      <div>${body}</div>
      <div class="row end" data-modal-actions></div>
    </div>
  </div>`;

  const bar = root.querySelector("[data-modal-actions]");
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.kind) button.className = action.kind;
    button.addEventListener("click", async () => {
      if (action.run) {
        button.disabled = true;
        const keepOpen = await action.run(root);
        button.disabled = false;
        if (keepOpen === false) return;
      }
      closeModal();
    });
    bar.appendChild(button);
  }

  root.querySelector(".modal-back").addEventListener("click", (event) => {
    if (event.target.dataset.close) closeModal();
  });
  document.addEventListener("keydown", onEscape);
  root.querySelector("input, textarea, select, .primary, button")?.focus();
}

export function confirmBox({ title, text, label, run }) {
  openModal({
    title,
    body: `<p class="flush">${esc(text)}</p>`,
    actions: [{ label: "Cancelar" }, { label, kind: "primary", run }],
  });
}
