import React from "react";
import { NOMBRE_CATEGORIA } from "../../data/productos";

const formatoCop = (valor) => `$${Number(valor).toLocaleString()}`;

// Valor agregado: resumen del negocio calculado con consultas SQL en el servidor.
function EstadisticasAdmin({ estadisticas, pedidos }) {
  if (!estadisticas) return <p className="estado-carga">Cargando estadísticas...</p>;

  const { inventario, ventas, stockBajo, porCategoria, masVendidos } = estadisticas;
  const maxUnidades = Math.max(1, ...porCategoria.map((fila) => fila.unidades));

  const tarjetas = [
    { titulo: "Productos", valor: inventario.productos },
    { titulo: "Unidades en stock", valor: inventario.unidades },
    { titulo: "Valor del inventario", valor: `${formatoCop(inventario.valorInventario)} COP` },
    { titulo: "Pedidos", valor: ventas.pedidos },
    { titulo: "Ingresos", valor: `${formatoCop(ventas.ingresos)} COP` },
    { titulo: "Agotados", valor: inventario.agotados, alerta: inventario.agotados > 0 },
  ];

  return (
    <div className="admin-stats">
      <div className="admin-stats__tarjetas">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.titulo}
            className={`admin-stats__tarjeta ${tarjeta.alerta ? "admin-stats__tarjeta--alerta" : ""}`}
          >
            <span className="admin-stats__etiqueta">{tarjeta.titulo}</span>
            <strong className="admin-stats__valor">{tarjeta.valor}</strong>
          </div>
        ))}
      </div>

      <div className="admin-stats__columnas">
        <section className="admin-caja">
          <h3 className="admin-caja__titulo">Unidades por categoría</h3>
          <ul className="admin-barras">
            {porCategoria.map((fila) => (
              <li key={fila.categoria} className="admin-barras__fila">
                <span className="admin-barras__nombre">{NOMBRE_CATEGORIA[fila.categoria] || fila.categoria}</span>
                <span className="admin-barras__pista">
                  <span
                    className="admin-barras__relleno"
                    style={{ width: `${(fila.unidades / maxUnidades) * 100}%` }}
                  />
                </span>
                <span className="admin-barras__valor">{fila.unidades}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-caja">
          <h3 className="admin-caja__titulo">Alertas de stock bajo (≤ 3)</h3>
          {stockBajo.length === 0 ? (
            <p className="seccion-vacia">Todo el inventario está bien abastecido.</p>
          ) : (
            <ul className="admin-lista">
              {stockBajo.map((producto) => (
                <li key={producto.id}>
                  <span>{producto.nombre}</span>
                  <strong className={producto.stock === 0 ? "admin-texto--peligro" : "admin-texto--alerta"}>
                    {producto.stock === 0 ? "Agotado" : `${producto.stock} u.`}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-caja">
          <h3 className="admin-caja__titulo">Más vendidos</h3>
          {masVendidos.length === 0 ? (
            <p className="seccion-vacia">Aún no hay ventas registradas.</p>
          ) : (
            <ul className="admin-lista">
              {masVendidos.map((producto) => (
                <li key={producto.nombre}>
                  <span>{producto.nombre}</span>
                  <strong>{producto.unidades} u.</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-caja">
          <h3 className="admin-caja__titulo">Últimos pedidos</h3>
          {pedidos.length === 0 ? (
            <p className="seccion-vacia">Aún no hay pedidos.</p>
          ) : (
            <ul className="admin-lista">
              {pedidos.slice(0, 6).map((pedido) => (
                <li key={pedido.id}>
                  <span>
                    {pedido.codigo} · {pedido.cliente} ({pedido.ciudad})
                  </span>
                  <strong>{formatoCop(pedido.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default EstadisticasAdmin;
