import React, { useState } from "react";
import { catalogoProductos } from "../data/productos";
import { useLocalStorage } from "../hooks/useLocalStorage";

const OPINION_INICIAL = {
  autor: "",
  productoId: "",
  calificacion: "5",
  comentario: "",
  recomienda: true,
};

const MAX_CARACTERES = 300;

function Estrellas({ cantidad }) {
  return (
    <span className="opiniones__estrellas" aria-label={`${cantidad} de 5 estrellas`}>
      {"★".repeat(cantidad)}
      {"☆".repeat(5 - cantidad)}
    </span>
  );
}

function Opiniones() {
  // Las opiniones se guardan en LocalStorage con el hook personalizado.
  const [opiniones, setOpiniones] = useLocalStorage("megabyte-opiniones", []);
  const [formulario, setFormulario] = useState(OPINION_INICIAL);
  const [error, setError] = useState("");
  const [filtroEstrellas, setFiltroEstrellas] = useState("todas");

  const manejarCambio = (evento) => {
    const { name, value, type, checked } = evento.target;
    setFormulario({ ...formulario, [name]: type === "checkbox" ? checked : value });
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();

    if (formulario.autor.trim().length < 3) {
      setError("Escribe tu nombre (mínimo 3 caracteres).");
      return;
    }
    if (!formulario.productoId) {
      setError("Selecciona el producto que quieres calificar.");
      return;
    }
    if (formulario.comentario.trim().length < 10) {
      setError("El comentario debe tener al menos 10 caracteres.");
      return;
    }

    const producto = catalogoProductos.find((p) => p.id === Number(formulario.productoId));
    const nuevaOpinion = {
      id: Date.now(),
      autor: formulario.autor.trim(),
      producto: producto.nombre,
      calificacion: Number(formulario.calificacion),
      comentario: formulario.comentario.trim(),
      recomienda: formulario.recomienda,
      fecha: new Date().toLocaleDateString("es-CO"),
    };

    setOpiniones([nuevaOpinion, ...opiniones]);
    setFormulario(OPINION_INICIAL);
    setError("");
  };

  const eliminarOpinion = (id) => {
    setOpiniones(opiniones.filter((opinion) => opinion.id !== id));
  };

  const opinionesVisibles =
    filtroEstrellas === "todas"
      ? opiniones
      : opiniones.filter((opinion) => opinion.calificacion === Number(filtroEstrellas));

  return (
    <section className="opiniones">
      <h2 className="tienda-main__subtitulo">Opiniones de clientes</h2>

      <form className="opiniones__form" onSubmit={manejarEnvio} noValidate>
        <div className="opiniones__fila">
          <label className="opiniones__campo">
            Tu nombre
            <input
              type="text"
              name="autor"
              value={formulario.autor}
              onChange={manejarCambio}
              placeholder="Ej: Andrés"
            />
          </label>

          <label className="opiniones__campo">
            Producto
            <select name="productoId" value={formulario.productoId} onChange={manejarCambio}>
              <option value="">-- Selecciona --</option>
              {catalogoProductos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="opiniones__calificacion">
          <legend>Calificación</legend>
          {["1", "2", "3", "4", "5"].map((valor) => (
            <label key={valor} className="filtros__check">
              <input
                type="radio"
                name="calificacion"
                value={valor}
                checked={formulario.calificacion === valor}
                onChange={manejarCambio}
              />
              {valor} ★
            </label>
          ))}
        </fieldset>

        <label className="opiniones__campo">
          Comentario
          <textarea
            name="comentario"
            rows={4}
            maxLength={MAX_CARACTERES}
            value={formulario.comentario}
            onChange={manejarCambio}
            placeholder="Cuéntanos tu experiencia con el producto..."
          />
          <span className="opiniones__contador">
            {formulario.comentario.length}/{MAX_CARACTERES} caracteres
          </span>
        </label>

        <label className="filtros__check">
          <input
            type="checkbox"
            name="recomienda"
            checked={formulario.recomienda}
            onChange={manejarCambio}
          />
          Recomiendo este producto
        </label>

        {error && <p className="checkout-form__mensaje checkout-form__mensaje--error">{error}</p>}

        <button type="submit" className="checkout-form__boton">
          Publicar opinión
        </button>
      </form>

      <div className="seccion-encabezado">
        <h3 className="opiniones__subtitulo">{opinionesVisibles.length} opinión(es)</h3>
        <select
          className="tienda-header__select"
          value={filtroEstrellas}
          onChange={(evento) => setFiltroEstrellas(evento.target.value)}
          aria-label="Filtrar opiniones por estrellas"
        >
          <option value="todas">Todas las estrellas</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} estrella(s)
            </option>
          ))}
        </select>
      </div>

      {opinionesVisibles.length === 0 ? (
        <p className="seccion-vacia">Todavía no hay opiniones. ¡Sé el primero en opinar!</p>
      ) : (
        <ul className="opiniones__lista">
          {opinionesVisibles.map((opinion) => (
            <li key={opinion.id} className="opiniones__item">
              <div className="historial__fila">
                <strong>{opinion.autor}</strong>
                <Estrellas cantidad={opinion.calificacion} />
              </div>
              <p className="opiniones__producto">{opinion.producto}</p>
              <p>{opinion.comentario}</p>
              <div className="historial__fila">
                <span className="historial__fecha">
                  {opinion.fecha} · {opinion.recomienda ? "👍 Lo recomienda" : "👎 No lo recomienda"}
                </span>
                <button
                  type="button"
                  className="carrito__item-quitar"
                  onClick={() => eliminarOpinion(opinion.id)}
                  aria-label="Eliminar opinión"
                  title="Eliminar opinión"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default Opiniones;
