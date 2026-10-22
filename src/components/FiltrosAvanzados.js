import React, { useState } from "react";

const OPCIONES_ORDEN = [
  { valor: "relevancia", etiqueta: "Relevancia" },
  { valor: "precio-asc", etiqueta: "Menor precio" },
  { valor: "precio-desc", etiqueta: "Mayor precio" },
  { valor: "nombre", etiqueta: "Nombre A-Z" },
];

function FiltrosAvanzados({ filtros, onFiltrosChange, marcas, precioTope, onLimpiar }) {
  // Estado local solo para mostrar u ocultar el panel de filtros.
  const [abierto, setAbierto] = useState(true);

  const actualizar = (campo, valor) => {
    onFiltrosChange({ ...filtros, [campo]: valor });
  };

  const alternarMarca = (marca) => {
    const yaSeleccionada = filtros.marcas.includes(marca);
    actualizar(
      "marcas",
      yaSeleccionada ? filtros.marcas.filter((m) => m !== marca) : [...filtros.marcas, marca]
    );
  };

  return (
    <div className="filtros">
      <button
        type="button"
        className="filtros__toggle"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        {abierto ? "▾ Ocultar filtros" : "▸ Mostrar filtros"}
      </button>

      {abierto && (
        <div className="filtros__panel">
          <fieldset className="filtros__grupo">
            <legend>Marcas</legend>
            <div className="filtros__marcas">
              {marcas.map((marca) => (
                <label key={marca} className="filtros__check">
                  <input
                    type="checkbox"
                    checked={filtros.marcas.includes(marca)}
                    onChange={() => alternarMarca(marca)}
                  />
                  {marca}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="filtros__grupo">
            <legend>Precio máximo: ${Number(filtros.precioMaximo).toLocaleString()} COP</legend>
            <input
              type="range"
              className="filtros__rango"
              min={0}
              max={precioTope}
              step={50000}
              value={filtros.precioMaximo}
              onChange={(evento) => actualizar("precioMaximo", Number(evento.target.value))}
            />
          </fieldset>

          <fieldset className="filtros__grupo">
            <legend>Ordenar por</legend>
            <div className="filtros__orden">
              {OPCIONES_ORDEN.map((opcion) => (
                <label key={opcion.valor} className="filtros__check">
                  <input
                    type="radio"
                    name="orden"
                    value={opcion.valor}
                    checked={filtros.orden === opcion.valor}
                    onChange={(evento) => actualizar("orden", evento.target.value)}
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="filtros__acciones">
            <label className="filtros__check">
              <input
                type="checkbox"
                checked={filtros.soloDisponibles}
                onChange={(evento) => actualizar("soloDisponibles", evento.target.checked)}
              />
              Solo productos con stock
            </label>
            <button type="button" className="filtros__limpiar" onClick={onLimpiar}>
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FiltrosAvanzados;
