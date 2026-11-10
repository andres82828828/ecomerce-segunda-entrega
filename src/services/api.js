// API pública y gratuita de tasas de cambio (no requiere llave).
const URL_TASA_CAMBIO = "https://open.er-api.com/v6/latest/USD";

// Petición a un servidor web con la API fetch de JavaScript.
// Devuelve cuántos pesos colombianos (COP) vale 1 dólar (USD).
export async function obtenerTasaUsdCop(signal) {
  const respuesta = await fetch(URL_TASA_CAMBIO, { signal });

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  return {
    tasa: datos.rates.COP,
    actualizado: datos.time_last_update_utc,
  };
}

// ==========================================
// Tercera entrega: API propia (Node + Express + SQLite, carpeta /server).
// Gracias al "proxy" de package.json, "/api/..." llega a http://localhost:4000.
// ==========================================

async function peticion(ruta, { metodo = "GET", cuerpo, token } = {}) {
  const cabeceras = {};
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch (error) {
    throw new Error("No se pudo conectar con el servidor. ¿Ejecutaste 'npm run dev'?");
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error || `Error HTTP ${respuesta.status}`);
    error.estado = respuesta.status;
    error.errores = datos.errores || {};
    throw error;
  }
  return datos;
}

// ---------- Productos (CRUD) ----------
export const listarProductos = () => peticion("/productos");
export const crearProducto = (producto, token) => peticion("/productos", { metodo: "POST", cuerpo: producto, token });
export const actualizarProducto = (id, producto, token) =>
  peticion(`/productos/${id}`, { metodo: "PUT", cuerpo: producto, token });
export const eliminarProducto = (id, token) => peticion(`/productos/${id}`, { metodo: "DELETE", token });

// ---------- Pedidos ----------
export const registrarPedido = (pedido) => peticion("/pedidos", { metodo: "POST", cuerpo: pedido });
export const listarPedidos = (token) => peticion("/pedidos", { token });

// ---------- Administrador ----------
export const iniciarSesion = (usuario, contrasena) =>
  peticion("/auth/login", { metodo: "POST", cuerpo: { usuario, contrasena } });
export const verificarSesion = (token) => peticion("/auth/sesion", { token });
export const cerrarSesion = (token) => peticion("/auth/logout", { metodo: "POST", token });
export const obtenerEstadisticas = (token) => peticion("/estadisticas", { token });
