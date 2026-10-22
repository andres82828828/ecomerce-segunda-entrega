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
