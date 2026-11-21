// Reenvía las peticiones "/api/..." de la tienda (puerto 3000) al servidor Express (puerto 4000).
// Reemplaza la opción "proxy" de package.json: con ella, React falla al arrancar
// ("allowedHosts[0] should be a non-empty string") cuando el PC tiene adaptadores como
// Tailscale o WSL, y además bloquea a quien entra desde otra IP (por ejemplo la de Tailscale).
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://localhost:${process.env.PUERTO || 4000}`,
      changeOrigin: true,
    })
  );
};
