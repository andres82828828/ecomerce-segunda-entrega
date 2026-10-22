import React from "react";

// Muestra las compras guardadas en LocalStorage (ver App.js -> finalizarCompra).
function HistorialCompras({ historial, onBorrarHistorial }) {
  return (
    <section className="historial">
      <div className="seccion-encabezado">
        <h2 className="tienda-main__subtitulo">Mis compras</h2>
        {historial.length > 0 && (
          <button type="button" className="boton-secundario" onClick={onBorrarHistorial}>
            Borrar historial
          </button>
        )}
      </div>

      {historial.length === 0 ? (
        <p className="seccion-vacia">Aún no has realizado compras. Tus facturas aparecerán aquí.</p>
      ) : (
        <ul className="historial__lista">
          {historial.map((compra) => (
            <li key={compra.id} className="historial__item">
              <div className="historial__fila">
                <strong>{compra.id}</strong>
                <span className="historial__fecha">{compra.fecha}</span>
              </div>
              <p className="historial__cliente">Cliente: {compra.cliente}</p>
              <ul className="historial__productos">
                {compra.productos.map((nombre, indice) => (
                  <li key={`${compra.id}-${indice}`}>{nombre}</li>
                ))}
              </ul>
              <p className="historial__total">
                {compra.cantidad} producto(s) · <strong>${compra.total.toLocaleString()} COP</strong>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default HistorialCompras;
