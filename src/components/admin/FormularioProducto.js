import React, { useEffect, useState } from "react";
import { NOMBRE_CATEGORIA } from "../../data/productos";

const PRODUCTO_VACIO = {
  nombre: "",
  categoria: "",
  marca: "",
  precio: "",
  stock: "",
  imagen: "",
  specUrl: "",
};

// Mismas reglas que valida el servidor (server/index.js -> validarProducto),
// para avisar al usuario antes de enviar.
function validarProducto(datos) {
  const errores = {};
  const precio = Number(datos.precio);
  const stock = Number(datos.stock);
  const esUrl = (valor) => !valor.trim() || /^https?:\/\//.test(valor.trim());

  if (datos.nombre.trim().length < 3) errores.nombre = "El nombre debe tener al menos 3 caracteres.";
  if (!datos.categoria) errores.categoria = "Selecciona una categoría.";
  if (datos.marca.trim().length < 2) errores.marca = "La marca es obligatoria.";
  if (datos.precio === "" || !Number.isInteger(precio) || precio <= 0) errores.precio = "Precio entero mayor a 0.";
  if (datos.stock === "" || !Number.isInteger(stock) || stock < 0) errores.stock = "Stock entero mayor o igual a 0.";
  if (!esUrl(datos.imagen)) errores.imagen = "Debe empezar por http:// o https://";
  if (!esUrl(datos.specUrl)) errores.specUrl = "Debe empezar por http:// o https://";
  return errores;
}

const CAMPOS_TEXTO = [
  { nombre: "nombre", etiqueta: "Nombre", placeholder: "Ej: NVIDIA GeForce RTX 5070" },
  { nombre: "marca", etiqueta: "Marca", placeholder: "Ej: NVIDIA" },
  { nombre: "precio", etiqueta: "Precio (COP)", placeholder: "Ej: 2500000", tipo: "number" },
  { nombre: "stock", etiqueta: "Stock", placeholder: "Ej: 10", tipo: "number" },
  { nombre: "imagen", etiqueta: "URL de la imagen", placeholder: "https://..." },
  { nombre: "specUrl", etiqueta: "URL de características", placeholder: "https://..." },
];

// Sirve para crear (productoEditando = null) y para editar un producto existente.
function FormularioProducto({ productoEditando, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(PRODUCTO_VACIO);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // useEffect: cuando se elige "Editar" en la tabla, se cargan sus datos en el formulario.
  useEffect(() => {
    setDatos(productoEditando ? { ...PRODUCTO_VACIO, ...productoEditando } : PRODUCTO_VACIO);
    setErrores({});
    setMensaje("");
  }, [productoEditando]);

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatos({ ...datos, [name]: value });
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = validarProducto(datos);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje("Revisa los campos marcados en rojo.");
      return;
    }

    setEnviando(true);
    try {
      await onGuardar({ ...datos, precio: Number(datos.precio), stock: Number(datos.stock) });
      setMensaje("");
      if (!productoEditando) setDatos(PRODUCTO_VACIO);
    } catch (error) {
      setErrores(error.errores || {});
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={manejarEnvio} noValidate>
      <h3 className="checkout-form__titulo">
        {productoEditando ? `Editar producto #${productoEditando.id}` : "Nuevo producto"}
      </h3>

      <div className="admin-form__grid">
        <div className="checkout-form__campo">
          <label htmlFor="producto-categoria">Categoría</label>
          <select
            id="producto-categoria"
            name="categoria"
            value={datos.categoria}
            onChange={manejarCambio}
            className={errores.categoria ? "checkout-form__input--error" : ""}
          >
            <option value="">-- Selecciona --</option>
            {Object.entries(NOMBRE_CATEGORIA).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
          {errores.categoria && <span className="checkout-form__error">{errores.categoria}</span>}
        </div>

        {CAMPOS_TEXTO.map((campo) => (
          <div key={campo.nombre} className="checkout-form__campo">
            <label htmlFor={`producto-${campo.nombre}`}>{campo.etiqueta}</label>
            <input
              id={`producto-${campo.nombre}`}
              name={campo.nombre}
              type={campo.tipo || "text"}
              min={campo.tipo === "number" ? 0 : undefined}
              value={datos[campo.nombre]}
              onChange={manejarCambio}
              placeholder={campo.placeholder}
              className={errores[campo.nombre] ? "checkout-form__input--error" : ""}
            />
            {errores[campo.nombre] && <span className="checkout-form__error">{errores[campo.nombre]}</span>}
          </div>
        ))}
      </div>

      <div className="admin-form__acciones">
        <button type="submit" className="checkout-form__boton" disabled={enviando}>
          {enviando ? "Guardando..." : productoEditando ? "Guardar cambios" : "Crear producto"}
        </button>
        {productoEditando && (
          <button type="button" className="boton-secundario" onClick={onCancelar}>
            Cancelar edición
          </button>
        )}
      </div>

      {mensaje && <p className="checkout-form__mensaje checkout-form__mensaje--error">{mensaje}</p>}
    </form>
  );
}

export default FormularioProducto;
