import React, { useState } from "react";
import { iniciarSesion } from "../../services/api";

// Formulario de acceso: solo el administrador puede modificar el catálogo.
function LoginAdmin({ onSesionIniciada }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    if (!usuario.trim() || !contrasena) {
      setError("Escribe el usuario y la contraseña.");
      return;
    }

    setEnviando(true);
    try {
      const sesion = await iniciarSesion(usuario.trim(), contrasena);
      setError("");
      onSesionIniciada(sesion);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="admin-login" onSubmit={manejarEnvio} noValidate>
      <h2 className="tienda-main__subtitulo">Acceso de administrador</h2>
      <p className="admin-login__ayuda">
        Inicia sesión para crear, editar y eliminar productos del catálogo.
      </p>

      <div className="checkout-form__campo">
        <label htmlFor="admin-usuario">Usuario</label>
        <input
          id="admin-usuario"
          type="text"
          autoComplete="username"
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
        />
      </div>

      <div className="checkout-form__campo">
        <label htmlFor="admin-contrasena">Contraseña</label>
        <input
          id="admin-contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
        />
      </div>

      <button type="submit" className="checkout-form__boton" disabled={enviando}>
        {enviando ? "Ingresando..." : "Ingresar"}
      </button>

      {error && <p className="checkout-form__mensaje checkout-form__mensaje--error">{error}</p>}
    </form>
  );
}

export default LoginAdmin;
