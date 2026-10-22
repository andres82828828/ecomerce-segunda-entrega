const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const REGEX_TELEFONO = /^[0-9]{7,10}$/;
const REGEX_DOCUMENTO = /^[0-9]{6,12}$/;

export function validarNombre(valor) {
  if (!valor.trim()) return "El nombre es obligatorio.";
  if (valor.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
  if (!REGEX_SOLO_LETRAS.test(valor.trim())) return "El nombre solo puede contener letras.";
  return "";
}

export function validarEmail(valor) {
  if (!valor.trim()) return "El correo es obligatorio.";
  if (!REGEX_EMAIL.test(valor.trim())) return "Ingresa un correo electrónico válido (ej: nombre@dominio.com).";
  return "";
}

export function validarTelefono(valor) {
  if (!valor.trim()) return "El teléfono es obligatorio.";
  if (!REGEX_TELEFONO.test(valor.trim())) return "El teléfono debe tener entre 7 y 10 dígitos numéricos.";
  return "";
}

export function validarDocumento(valor) {
  if (!valor.trim()) return "El documento es obligatorio.";
  if (!REGEX_DOCUMENTO.test(valor.trim())) return "El documento debe tener entre 6 y 12 dígitos numéricos.";
  return "";
}

export function validarDireccion(valor) {
  if (!valor.trim()) return "La dirección es obligatoria.";
  if (valor.trim().length < 5) return "Ingresa una dirección completa.";
  return "";
}

export function validarCiudad(valor) {
  if (!valor.trim()) return "La ciudad es obligatoria.";
  if (!REGEX_SOLO_LETRAS.test(valor.trim())) return "La ciudad solo puede contener letras.";
  return "";
}



export function validarDatosFacturacion(datos) {
  const errores = {
    nombre: validarNombre(datos.nombre),
    email: validarEmail(datos.email),
    telefono: validarTelefono(datos.telefono),
    documento: validarDocumento(datos.documento),
    direccion: validarDireccion(datos.direccion),
    ciudad: validarCiudad(datos.ciudad),
  };

  const esValido = Object.values(errores).every((mensaje) => mensaje === "");
  return { esValido, errores };
}