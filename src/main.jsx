import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(${import.meta.env.BASE_URL}sw.js)
      .then(() => {
        console.log("Service Worker registrado com sucesso!");
      })
      .catch((error) => {
        console.error("Erro ao registrar Service Worker:", error);
      });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
