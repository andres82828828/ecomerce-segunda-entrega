import React, { useState } from "react";

// Zona donde se pueden SOLTAR (drop) las tarjetas de producto que se
// ARRASTRAN (drag) desde el catálogo. Envuelve al carrito (children).
function CarritoDropZone({ onSoltarProducto, children }) {
  const [arrastrandoEncima, setArrastrandoEncima] = useState(false);

  const manejarDragOver = (evento) => {
    // Sin preventDefault el navegador no permite soltar elementos aquí.
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "copy";
    if (!arrastrandoEncima) setArrastrandoEncima(true);
  };

  const manejarDragLeave = (evento) => {
    // Solo se apaga el resaltado si el cursor salió de toda la zona.
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      setArrastrandoEncima(false);
    }
  };

  const manejarDrop = (evento) => {
    evento.preventDefault();
    setArrastrandoEncima(false);
    const idProducto = Number(evento.dataTransfer.getData("text/plain"));
    if (idProducto) onSoltarProducto(idProducto);
  };

  return (
    <div
      className={`carrito-drop ${arrastrandoEncima ? "carrito-drop--activo" : ""}`}
      onDragOver={manejarDragOver}
      onDragLeave={manejarDragLeave}
      onDrop={manejarDrop}
    >
      {children}
      <p className="carrito-drop__ayuda">
        {arrastrandoEncima ? "¡Suelta para añadir al carrito!" : "Tip: arrastra un producto y suéltalo aquí"}
      </p>
    </div>
  );
}

export default CarritoDropZone;
