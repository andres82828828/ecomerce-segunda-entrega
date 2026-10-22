import React, { useState } from "react";
import { NOMBRE_CATEGORIA } from "../data/productos";
import { validarDatosFacturacion } from "../utils/validaciones";
import { descargarFacturaPDF } from "../utils/generarFacturaPdf";
import HeroBanner from "./HeroBanner";
import MenuNavegacion from "./MenuNavegacion";
import FiltrosAvanzados from "./FiltrosAvanzados";
import CarritoDropZone from "./CarritoDropZone";
import ConversorDolares from "./ConversorDolares";
import Opiniones from "./Opiniones";
import HistorialCompras from "./HistorialCompras";

function Header({
  busqueda,
  onBusquedaChange,
  categoriaFiltro,
  onCategoriaChange,
  categorias,
  nombresCategoria,
  totalResultados,
}) {
  return (
    <header className="tienda-header">
      <div className="tienda-header__marca">
        <span className="tienda-header__isotipo" aria-hidden="true">M</span>
        <div>
          <h1 className="tienda-header__titulo">MEGABYTE</h1>
          <p className="tienda-header__eslogan">Hardware para PC gaming de alto rendimiento</p>
        </div>
      </div>

      <div className="tienda-header__controles">
        <input
          type="text"
          className="tienda-header__input"
          placeholder="Buscar tarjeta o componente..."
          value={busqueda}
          onChange={(evento) => onBusquedaChange(evento.target.value)}
          aria-label="Buscar producto"
        />
        <select
          className="tienda-header__select"
          value={categoriaFiltro}
          onChange={(evento) => onCategoriaChange(evento.target.value)}
          aria-label="Filtrar por categoría"
        >
          {categorias.map((categoria) => (
            <option key={categoria} value={categoria}>
              {nombresCategoria[categoria] || categoria}
            </option>
          ))}
        </select>
        <span className="tienda-header__contador">{totalResultados} resultados</span>
      </div>
    </header>
  );
}

function ProductCard({ producto, onAgregar }) {
  const sinStock = producto.stock === 0;
  const stockBajo = producto.stock > 0 && producto.stock <= 3;

  // Drag and Drop: al empezar a arrastrar se guarda el id del producto.
  const manejarDragStart = (evento) => {
    evento.dataTransfer.setData("text/plain", String(producto.id));
    evento.dataTransfer.effectAllowed = "copy";
  };

  return (
    <article
      className={`product-card ${sinStock ? "product-card--agotado" : ""}`}
      draggable={!sinStock}
      onDragStart={manejarDragStart}
    >
      <div className="product-card__media">
        <img src={producto.imagen} alt={producto.nombre} loading="lazy" />
        <span className="product-card__categoria">
          {NOMBRE_CATEGORIA[producto.categoria] || producto.categoria}
        </span>
      </div>

      <div className="product-card__cuerpo">
        <p className="product-card__marca">{producto.marca}</p>
        <h3 className="product-card__nombre">{producto.nombre}</h3>

        <div className="product-card__precio-fila">
          <span className="product-card__precio">
            ${producto.precio.toLocaleString()} <small>COP</small>
          </span>
          <span className={`product-card__stock ${stockBajo ? "product-card__stock--bajo" : ""}`}>
            {sinStock ? "Agotado" : `${producto.stock} disponibles`}
          </span>
        </div>

        <a
          href={producto.specUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="product-card__specs-link"
        >
          Ver características oficiales de {producto.marca} ↗
        </a>

        <button
          type="button"
          className="product-card__boton"
          onClick={() => onAgregar(producto)}
          disabled={sinStock}
        >
          {sinStock ? "Sin stock" : "Añadir al carrito"}
        </button>
      </div>
    </article>
  );
}

function ProductGrid({ productos, onAgregar }) {
  if (productos.length === 0) {
    return (
      <div className="product-grid__vacio">
        <p>No encontramos productos que coincidan con tu búsqueda.</p>
        <p className="product-grid__vacio-sugerencia">
          Prueba con otro término o cambia la categoría seleccionada.
        </p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} onAgregar={onAgregar} />
      ))}
    </div>
  );
}

function CartSidebar({ carrito, onQuitar, total }) {
  return (
    <section className="carrito" aria-label="Carrito de compras">
      <h2 className="carrito__titulo">Carrito de compras</h2>

      {carrito.length === 0 ? (
        <p className="carrito__vacio">No hay componentes seleccionados todavía.</p>
      ) : (
        <ul className="carrito__lista">
          {carrito.map((item, indice) => (
            <li key={`${item.id}-${indice}`} className="carrito__item">
              <span className="carrito__item-nombre">{item.nombre}</span>
              <span className="carrito__item-precio">${item.precio.toLocaleString()}</span>
              <button
                type="button"
                className="carrito__item-quitar"
                onClick={() => onQuitar(indice)}
                aria-label={`Quitar ${item.nombre} del carrito`}
                title="Quitar del carrito"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="carrito__total">
        <span>Total</span>
        <strong>${total.toLocaleString()} COP</strong>
      </div>
    </section>
  );
}

const DATOS_INICIALES = {
  nombre: "",
  email: "",
  telefono: "",
  documento: "",
  direccion: "",
  ciudad: "",
};

function CheckoutForm({ carrito, total, onFacturaGenerada }) {
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatos({ ...datos, [name]: value });
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();

    if (carrito.length === 0) {
      setEsError(true);
      setMensaje("Tu carrito está vacío. Agrega al menos un producto antes de facturar.");
      return;
    }

    const resultado = validarDatosFacturacion(datos);
    setErrores(resultado.errores);

    if (!resultado.esValido) {
      setEsError(true);
      setMensaje("Revisa los campos marcados en rojo antes de continuar.");
      return;
    }

    const orden = {
      id: `MB-${Date.now()}`,
      fecha: new Date().toLocaleString("es-CO"),
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      documento: datos.documento,
      direccion: datos.direccion,
      ciudad: datos.ciudad,
      items: carrito,
      total,
    };

    descargarFacturaPDF(orden);

    setEsError(false);
    setMensaje("¡Listo! Tu factura se descargó en PDF.");
    setDatos(DATOS_INICIALES);
    setErrores({});
    onFacturaGenerada(orden);
  };

  return (
    <form className="checkout-form" onSubmit={manejarEnvio} noValidate>
      <h3 className="checkout-form__titulo">Datos de facturación</h3>
      <p className="checkout-form__subtitulo">Al confirmar, tu factura se descarga en PDF.</p>

      <div className="checkout-form__campo">
        <label htmlFor="nombre">Nombre completo</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={datos.nombre}
          onChange={manejarCambio}
          placeholder="Ej: Laura Gómez"
          className={errores.nombre ? "checkout-form__input--error" : ""}
        />
        {errores.nombre && <span className="checkout-form__error">{errores.nombre}</span>}
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          name="email"
          type="email"
          value={datos.email}
          onChange={manejarCambio}
          placeholder="ej: nombre@correo.com"
          className={errores.email ? "checkout-form__input--error" : ""}
        />
        {errores.email && <span className="checkout-form__error">{errores.email}</span>}
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="telefono">Teléfono</label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          value={datos.telefono}
          onChange={manejarCambio}
          placeholder="Ej: 3001234567"
          className={errores.telefono ? "checkout-form__input--error" : ""}
        />
        {errores.telefono && <span className="checkout-form__error">{errores.telefono}</span>}
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="documento">Documento de identidad</label>
        <input
          id="documento"
          name="documento"
          type="text"
          value={datos.documento}
          onChange={manejarCambio}
          placeholder="Ej: 1020304050"
          className={errores.documento ? "checkout-form__input--error" : ""}
        />
        {errores.documento && <span className="checkout-form__error">{errores.documento}</span>}
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="direccion">Dirección de envío</label>
        <input
          id="direccion"
          name="direccion"
          type="text"
          value={datos.direccion}
          onChange={manejarCambio}
          placeholder="Ej: Calle 10 # 5-20"
          className={errores.direccion ? "checkout-form__input--error" : ""}
        />
        {errores.direccion && <span className="checkout-form__error">{errores.direccion}</span>}
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="ciudad">Ciudad</label>
        <input
          id="ciudad"
          name="ciudad"
          type="text"
          value={datos.ciudad}
          onChange={manejarCambio}
          placeholder="Ej: Bogotá"
          className={errores.ciudad ? "checkout-form__input--error" : ""}
        />
        {errores.ciudad && <span className="checkout-form__error">{errores.ciudad}</span>}
      </div>

      <button type="submit" className="checkout-form__boton">
        Confirmar y descargar factura
      </button>

      {mensaje && (
        <p className={`checkout-form__mensaje checkout-form__mensaje--${esError ? "error" : "exito"}`}>
          {mensaje}
        </p>
      )}
    </form>
  );
}

function Footer() {
  return (
    <footer className="tienda-footer">
      <p>MEGABYTE — Hardware para PC gaming. Cotización en línea, sin intermediarios.</p>
    </footer>
  );
}

function StoreLayout({
  busqueda,
  onBusquedaChange,
  categoriaFiltro,
  onCategoriaChange,
  categorias,
  nombresCategoria,
  totalResultados,
  productosFiltrados,
  onAgregar,
  carrito,
  onQuitar,
  total,
  onFacturaGenerada,
  seccionActiva,
  onCambiarSeccion,
  filtros,
  onFiltrosChange,
  marcasDisponibles,
  precioTope,
  onLimpiarFiltros,
  onSoltarProducto,
  historial,
  onBorrarHistorial,
  totalProductos,
}) {
  return (
    <div className="tienda">
      <Header
        busqueda={busqueda}
        onBusquedaChange={onBusquedaChange}
        categoriaFiltro={categoriaFiltro}
        onCategoriaChange={onCategoriaChange}
        categorias={categorias}
        nombresCategoria={nombresCategoria}
        totalResultados={totalResultados}
      />

      <HeroBanner totalProductos={totalProductos} />

      <MenuNavegacion
        seccionActiva={seccionActiva}
        onCambiarSeccion={onCambiarSeccion}
        cantidadCompras={historial.length}
      />

      <main className="tienda-main">
        <section className="tienda-main__catalogo">
          {seccionActiva === "catalogo" && (
            <>
              <h2 className="tienda-main__subtitulo">Catálogo de productos</h2>
              <FiltrosAvanzados
                filtros={filtros}
                onFiltrosChange={onFiltrosChange}
                marcas={marcasDisponibles}
                precioTope={precioTope}
                onLimpiar={onLimpiarFiltros}
              />
              <ProductGrid productos={productosFiltrados} onAgregar={onAgregar} />
            </>
          )}

          {seccionActiva === "opiniones" && <Opiniones />}

          {seccionActiva === "historial" && (
            <HistorialCompras historial={historial} onBorrarHistorial={onBorrarHistorial} />
          )}
        </section>

        <aside className="tienda-main__panel">
          <CarritoDropZone onSoltarProducto={onSoltarProducto}>
            <CartSidebar carrito={carrito} onQuitar={onQuitar} total={total} />
          </CarritoDropZone>
          <ConversorDolares totalCop={total} />
          <CheckoutForm carrito={carrito} total={total} onFacturaGenerada={onFacturaGenerada} />
        </aside>
      </main>

      <Footer />
    </div>
  );
}

export default StoreLayout;