import { state } from "./state.js";
import { ConnectionError, connect, revokedMessage, watch } from "./data.js";
import { bindEvents } from "./actions.js";
import { render, rerender } from "./app.js";

const SLOW_CONNECTION_MS = 10000;

async function boot() {
  bindEvents(document.getElementById("app"));

  const slowTimer = setTimeout(() => {
    state.slow = true;
    render();
  }, SLOW_CONNECTION_MS);

  try {
    await connect();
  } catch (error) {
    clearTimeout(slowTimer);
    state.fatal = error instanceof ConnectionError ? error.message : "No se pudo conectar.";
    render();
    return;
  }

  watch({
    onChange: rerender,
    onSynced() {
      clearTimeout(slowTimer);
      state.slow = false;
    },
    onError(error) {
      clearTimeout(slowTimer);
      console.error(error);
      state.lastError = error?.code || error?.message || "desconocido";
      if (error?.code === "revoked") state.fatal = revokedMessage();
      else state.slow = true;
      render();
    },
  });
  render();
}

boot();
