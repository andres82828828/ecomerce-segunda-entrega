import React, { useCallback, useEffect, useState } from "react";
import { NOMBRE_CATEGORIA } from "../../data/productos";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  actualizarProducto,
  cerrarSesion,
  crearProducto,
  eliminarProducto,
  listarPedidos,
  obtenerEstadisticas,
  verificarSesion,
} from "../../services/api";
import LoginAdmin from "./LoginAdmin";
import FormularioProducto from "./FormularioProducto";
import EstadisticasAdmin from "./EstadisticasAdmin";

// Panel de administración: CRUD de productos contra la base de datos + estadísticas.
function PanelAdmin({ productos, onProductosCambiados }) {
  const [sesion, setSesion] = useLocalStorage("megabyte-admin-sesion", null);
  const [productoEditando, setProductoEditando] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [aviso, setAviso] = useState("");
  const [filtroTabla, setFiltroTabla] = useState("");

  const token = sesion?.token;

  // Si el servidor responde 401 (sesión vencida), se vuelve al login.
  const manejarError = useCallback(
    (error) => {
      if (error.estado === 401) setSesion(null);
      setAviso(error.message);
    },
    [setSesion]
  );

  const cargarResumen = useCallback(async () => {
    if (!token) return;
    try {
      const [nuevasEstadisticas, nuevosPedidos] = await Promise.all([
        obtenerEstadisticas(token),
        listarPedidos(token),
      ]);
      setEstadisticas(nuevasEstadisticas);
      setPedidos(nuevosPedidos);
    } catch (error) {
      manejarError(error);
    }
  }, [token, manejarError]);

  // useEffect: al entrar al panel se comprueba que la sesión guardada siga siendo válida.
  useEffect(() => {
    if (!token) return;
    verificarSesion(token).catch(manejarError);
  }, [token, manejarError]);

  // useEffect: las estadísticas se recalculan cada vez que cambia el catálogo.
  useEffect(() => {
    cargarResumen();
  }, [cargarResumen, productos]);

  const guardarProducto = async (datos) => {
    try {
      if (productoEditando) {
        await actualizarProducto(productoEditando.id, datos, token);
        setAviso(`Producto "${datos.nombre}" actualizado.`);
      } else {
        await crearProducto(datos, token);
        setAviso(`Producto "${datos.nombre}" creado.`);
      }
      setProductoEditando(null);
      await onProductosCambiados();
    } catch (error) {
      if (error.estado === 401) setSesion(null);
      throw error; // el formulario muestra el mensaje y los errores por campo
    }
  };

  const borrarProducto = async (producto) => {
    if (!window.confirm(`¿Eliminar "${producto.nombre}" de la base de datos?`)) return;
    try {
      await eliminarProducto(producto.id, token);
      if (productoEditando?.id === producto.id) setProductoEditando(null);
      setAviso(`Producto "${producto.nombre}" eliminado.`);
      await onProductosCambiados();
    } catch (error) {
      manejarError(error);
    }
  };

  const salir = async () => {
    try {
      await cerrarSesion(token);
    } catch (error) {
      // Aunque falle el servidor, la sesión local se cierra igual.
    }
    setSesion(null);
    setEstadisticas(null);
    setAviso("");
  };

  if (!token) {
    return <LoginAdmin onSesionIniciada={setSesion} />;
  }

  const textoFiltro = filtroTabla.trim().toLowerCase();
  const productosTabla = productos.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(textoFiltro) ||
      producto.marca.toLowerCase().includes(textoFiltro)
  );

  return (
    <section className="admin">
      <div className="seccion-encabezado">
        <h2 className="tienda-main__subtitulo">Panel de administración</h2>
        <div className="admin__sesion">
          <span>
            Sesión: <strong>{sesion.usuario}</strong>
          </span>
          <button type="button" className="boton-secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {aviso && (
        <p className="admin__aviso" role="status">
          {aviso}
          <button type="button" onClick={() => setAviso("")} aria-label="Cerrar aviso">
            ×
          </button>
        </p>
      )}

      <EstadisticasAdmin estadisticas={estadisticas} pedidos={pedidos} />

      <FormularioProducto
        productoEditando={productoEditando}
        onGuardar={guardarProducto}
        onCancelar={() => setProductoEditando(null)}
      />

      <div className="admin-tabla__encabezado">
        <h3 className="checkout-form__titulo">Productos en la base de datos ({productos.length})</h3>
        <input
          type="text"
          className="tienda-header__input admin-tabla__buscar"
          placeholder="Buscar por nombre o marca..."
          value={filtroTabla}
          onChange={(evento) => setFiltroTabla(evento.target.value)}
          aria-label="Buscar en la tabla de productos"
        />
      </div>

      <div className="admin-tabla__contenedor">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Marca</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosTabla.map((producto) => (
              <tr
                key={producto.id}
                className={productoEditando?.id === producto.id ? "admin-tabla__fila--editando" : ""}
              >
                <td>{producto.id}</td>
                <td>{producto.nombre}</td>
                <td>{NOMBRE_CATEGORIA[producto.categoria] || producto.categoria}</td>
                <td>{producto.marca}</td>
                <td>${producto.precio.toLocaleString()}</td>
                <td className={producto.stock <= 3 ? "admin-texto--alerta" : ""}>{producto.stock}</td>
                <td className="admin-tabla__acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => {
                      setProductoEditando(producto);
                      document.querySelector(".admin-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="boton-secundario admin-boton--peligro"
                    onClick={() => borrarProducto(producto)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosTabla.length === 0 && <p className="seccion-vacia">Ningún producto coincide.</p>}
      </div>
    </section>
  );
}

export default PanelAdmin;
