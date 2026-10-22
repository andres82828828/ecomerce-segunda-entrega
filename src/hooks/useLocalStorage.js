import { useEffect, useState } from "react";

// Hook personalizado: funciona igual que useState, pero además guarda el valor
// en el LocalStorage del navegador para que no se pierda al recargar la página.
export function useLocalStorage(clave, valorInicial) {
  // useState con función inicial: se lee el LocalStorage solo la primera vez.
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado !== null ? JSON.parse(guardado) : valorInicial;
    } catch (error) {
      return valorInicial;
    }
  });

  // useEffect: cada vez que cambia "valor", se vuelve a guardar en LocalStorage.
  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      console.warn(`No se pudo guardar "${clave}" en LocalStorage`, error);
    }
  }, [clave, valor]);

  return [valor, setValor];
}
