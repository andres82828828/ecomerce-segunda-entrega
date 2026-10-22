import React, { useEffect, useMemo, useState } from "react";
import { catalogoProductos, categoriasDisponibles, NOMBRE_CATEGORIA } from "./data/productos";
import StoreLayout from "./components/StoreLayout";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";
import "./SegundaEntrega.css";

const PRECIO_TOPE = Math.max(...catalogoProductos.map((producto) => producto.precio));

const FILTROS_INICIALES = {
  marcas: [],
  precioMaximo: PRECIO_TOPE,
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
  // Segunda entrega: productos (stock), carrito e historial se guardan en LocalStorage.
  const [productos, setProductos] = useLocalStorage("megabyte-productos", catalogoProductos);
  const [carrito, setCarrito] = useLocalStorage("megabyte-carrito", []);
  const [historial, setHistorial] = useLocalStorage("megabyte-historial", []);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [seccionActiva, setSeccionActiva] = useState("catalogo");

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

  const finalizarCompra = (orden) => {
    setProductos((catalogoActual) =>
      catalogoActual.map((prodCatalogo) => {
        const cantidadComprada = carrito.filter((item) => item.id === prodCatalogo.id).length;

        if (cantidadComprada > 0) {
          return {
            ...prodCatalogo,
            stock: Math.max(0, prodCatalogo.stock - cantidadComprada),
          };
        }
        return prodCatalogo;
      })
    );

    if (orden) {
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
    }

    setCarrito([]);
  };

  const totalCarrito = useMemo(
    () => carrito.reduce((acumulado, item) => acumulado + item.precio, 0),
    [carrito]
  );

  const marcasDisponibles = useMemo(
    () => Array.from(new Set(catalogoProductos.map((producto) => producto.marca))).sort(),
    []
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
      precioTope={PRECIO_TOPE}
      onLimpiarFiltros={limpiarFiltros}
      onSoltarProducto={agregarPorId}
      historial={historial}
      onBorrarHistorial={() => setHistorial([])}
      totalProductos={productos.length}
    />
  );
}

export default App;
