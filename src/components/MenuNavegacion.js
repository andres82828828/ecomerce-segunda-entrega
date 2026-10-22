import React from "react";

const OPCIONES_MENU = [
  { id: "catalogo", etiqueta: "Catálogo" },
  { id: "opiniones", etiqueta: "Opiniones" },
  { id: "historial", etiqueta: "Mis compras" },
];

// Menú controlado por una variable de estado (seccionActiva) que vive en App.js.
function MenuNavegacion({ seccionActiva, onCambiarSeccion, cantidadCompras }) {
  return (
    <nav className="menu" aria-label="Secciones de la tienda">
      {OPCIONES_MENU.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          className={`menu__opcion ${seccionActiva === opcion.id ? "menu__opcion--activa" : ""}`}
          onClick={() => onCambiarSeccion(opcion.id)}
        >
          {opcion.etiqueta}
          {opcion.id === "historial" && cantidadCompras > 0 && (
            <span className="menu__badge">{cantidadCompras}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default MenuNavegacion;
