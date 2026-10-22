import React from "react";
// Imagen local importada desde la carpeta src/assets (React/webpack la empaqueta).
import bannerMegabyte from "../assets/banner-megabyte.svg";

function HeroBanner({ totalProductos }) {
  return (
    <section className="hero">
      <div className="hero__texto">
        <p className="hero__etiqueta">Nueva temporada gamer</p>
        <h2 className="hero__titulo">Arma el PC de tus sueños, pieza por pieza</h2>
        <p className="hero__descripcion">
          {totalProductos} componentes de NVIDIA, AMD, Intel, Corsair y más. Filtra, compara precios
          en pesos y dólares, y arrastra tus favoritos directo al carrito.
        </p>
      </div>
      <img className="hero__imagen" src={bannerMegabyte} alt="Ilustración de un chip MEGABYTE" />
    </section>
  );
}

export default HeroBanner;
