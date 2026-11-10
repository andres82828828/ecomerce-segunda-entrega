import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NOMBRE_CATEGORIA } from "./data/productos";
import StoreLayout from "./components/StoreLayout";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { listarProductos, registrarPedido } from "./services/api";
import "./App.css";
import "./SegundaEntrega.css";
import "./TerceraEntrega.css";

// Mientras no se haya tocado el slider, el precio máximo es "sin límite".
const FILTROS_INICIALES = {
  marcas: [],
  precioMaximo: Infinity,
  soloDisponibles: false,
  orden: "relevancia",
};

function ordenarProductos(lista, orden) {
  const copia = [...lista];
  if (orden === "precio-asc") return copia.sort((a, b) => a.precio - b.precio);
  if (orden === "precio-desc") return copia.sort((a, b) => b.precio - a.precio);
  if (orden === "nombre") return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return copia;
}

export function App() {
  // Tercera entrega: los productos vienen de la base de datos (API).
  // El carrito y el historial del cliente siguen en LocalStorage.
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [carrito, setCarrito] = useLocalStorage("megabyte-carrito", []);
  const [historial, setHistorial] = useLocalStorage("megabyte-historial", []);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [seccionActiva, setSeccionActiva] = useState("catalogo");

  const recargarProductos = useCallback(async () => {
    try {
      setProductos(await listarProductos());
      setErrorCarga("");
    } catch (error) {
      setErrorCarga(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // useEffect: al montar la app se piden los productos al servidor.
  useEffect(() => {
    recargarProductos();
  }, [recargarProductos]);

  // useEffect: actualiza el título de la pestaña cada vez que cambia el carrito.
  useEffect(() => {
    document.title =
      carrito.length > 0 ? `(${carrito.length}) MEGABYTE - Carrito` : "MEGABYTE - Hardware gamer";
  }, [carrito.length]);

  const agregarAlCarrito = (producto) => {
    const unidadesEnCarrito = carrito.filter((item) => item.id === producto.id).length;
    if (unidadesEnCarrito < producto.stock) {
      setCarrito((actual) => [...actual, producto]);
    } else {
      alert(`¡Lo sentimos! No hay más stock disponible de ${producto.nombre}. Stock actual: ${producto.stock}`);
    }
  };

  // Usado por el Drag and Drop: recibe el id del producto soltado en el carrito.
  const agregarPorId = (idProducto) => {
    const producto = productos.find((item) => item.id === idProducto);
    if (producto) agregarAlCarrito(producto);
  };

  const quitarDelCarrito = (indice) => {
    setCarrito((actual) => actual.filter((_, i) => i !== indice));
  };

  // Guarda el pedido en la BD (el servidor valida y descuenta el stock).
  // Si falla, lanza el error para que el formulario lo muestre y no se descargue la factura.
  const finalizarCompra = async (orden) => {
    const cantidades = {};
    carrito.forEach((item) => {
      cantidades[item.id] = (cantidades[item.id] || 0) + 1;
    });

    try {
      await registrarPedido({
        codigo: orden.id,
        cliente: orden.nombre,
        email: orden.email,
        ciudad: orden.ciudad,
        items: Object.entries(cantidades).map(([id, cantidad]) => ({ id: Number(id), cantidad })),
      });
    } finally {
      // Con éxito o sin él, se refresca el stock real desde la BD.
      await recargarProductos();
    }

    setHistorial((actual) => [
      {
        id: orden.id,
        fecha: orden.fecha,
        cliente: orden.nombre,
        cantidad: orden.items.length,
        total: orden.total,
        productos: orden.items.map((item) => item.nombre),
      },
      ...actual,
    ]);

    setCarrito([]);
  };

  const totalCarrito = useMemo(
    () => carrito.reduce((acumulado, item) => acumulado + item.precio, 0),
    [carrito]
  );

  const marcasDisponibles = useMemo(
    () => Array.from(new Set(productos.map((producto) => producto.marca))).sort(),
    [productos]
  );

  const categoriasDisponibles = useMemo(
    () => ["Todas", ...Array.from(new Set(productos.map((producto) => producto.categoria)))],
    [productos]
  );

  const precioTope = useMemo(
    () => (productos.length > 0 ? Math.max(...productos.map((producto) => producto.precio)) : 0),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    const resultado = productos.filter((producto) => {
      const coincideTexto = producto.nombre.toLowerCase().includes(textoBusqueda);
      const coincideCategoria =
        categoriaFiltro === "Todas" || producto.categoria === categoriaFiltro;
      const coincideMarca =
        filtros.marcas.length === 0 || filtros.marcas.includes(producto.marca);
      const coincidePrecio = producto.precio <= filtros.precioMaximo;
      const coincideStock = !filtros.soloDisponibles || producto.stock > 0;
      return coincideTexto && coincideCategoria && coincideMarca && coincidePrecio && coincideStock;
    });
    return ordenarProductos(resultado, filtros.orden);
  }, [productos, busqueda, categoriaFiltro, filtros]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaFiltro("Todas");
    setFiltros(FILTROS_INICIALES);
  };

  return (
    <StoreLayout
      busqueda={busqueda}
      onBusquedaChange={setBusqueda}
      categoriaFiltro={categoriaFiltro}
      onCategoriaChange={setCategoriaFiltro}
      categorias={categoriasDisponibles}
      nombresCategoria={NOMBRE_CATEGORIA}
      totalResultados={productosFiltrados.length}
      productosFiltrados={productosFiltrados}
      onAgregar={agregarAlCarrito}
      carrito={carrito}
      onQuitar={quitarDelCarrito}
      total={totalCarrito}
      onFacturaGenerada={finalizarCompra}
      seccionActiva={seccionActiva}
      onCambiarSeccion={setSeccionActiva}
      filtros={filtros}
      onFiltrosChange={setFiltros}
      marcasDisponibles={marcasDisponibles}
      precioTope={precioTope}
      onLimpiarFiltros={limpiarFiltros}
      onSoltarProducto={agregarPorId}
      historial={historial}
      onBorrarHistorial={() => setHistorial([])}
      totalProductos={productos.length}
      productos={productos}
      cargando={cargando}
      errorCarga={errorCarga}
      onReintentar={recargarProductos}
      onProductosCambiados={recargarProductos}
    />
  );
}

export default App;
