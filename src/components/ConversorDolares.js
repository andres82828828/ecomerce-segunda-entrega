import React, { useEffect, useState } from "react";
import { obtenerTasaUsdCop } from "../services/api";

function ConversorDolares({ totalCop }) {
  const [tasa, setTasa] = useState(null);
  const [actualizado, setActualizado] = useState("");
  const [error, setError] = useState("");
  const [recargas, setRecargas] = useState(0);

  // useEffect + fetch: consulta la tasa al montar el componente
  // y cada vez que el usuario pulsa "Actualizar" (cambia "recargas").
  useEffect(() => {
    const controlador = new AbortController();
    setError("");

    obtenerTasaUsdCop(controlador.signal)
      .then((resultado) => {
        setTasa(resultado.tasa);
        setActualizado(resultado.actualizado);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("No se pudo consultar la tasa de cambio. Revisa tu conexión.");
        }
      });

    // Limpieza: si el componente se desmonta, se cancela la petición.
    return () => controlador.abort();
  }, [recargas]);

  const cargando = tasa === null && !error;
  const totalUsd = tasa ? totalCop / tasa : 0;

  return (
    <section className="conversor" aria-label="Total en dólares">
      <div className="conversor__encabezado">
        <h3 className="conversor__titulo">Total en dólares</h3>
        <button
          type="button"
          className="conversor__boton"
          onClick={() => setRecargas((actual) => actual + 1)}
        >
          Actualizar
        </button>
      </div>

      {cargando && <p className="conversor__texto">Consultando tasa de cambio...</p>}
      {error && <p className="conversor__texto conversor__texto--error">{error}</p>}

      {tasa && !error && (
        <>
          <p className="conversor__total">
            ≈ US$ {totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="conversor__texto">
            1 USD = ${Math.round(tasa).toLocaleString()} COP
            {actualizado && <span className="conversor__fecha"> · {actualizado}</span>}
          </p>
        </>
      )}
    </section>
  );
}

export default ConversorDolares;
