const crypto = require("crypto");
const express = require("express");
const { db, contrasenaValida } = require("./db");

const PUERTO = process.env.PUERTO || 4000;
const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas
const CATEGORIAS_VALIDAS = ["graficas", "procesadores", "ram", "fuentes", "placas", "gabinetes", "ssd", "nvme"];

const app = express();
app.use(express.json());

// ==========================================
// Autenticación del administrador
// ==========================================

// Middleware: deja pasar solo peticiones con un token de sesión válido.
function requiereAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const sesion = db
    .prepare(
      `SELECT s.token, s.expira, u.id, u.usuario
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token = ?`
    )
    .get(token);

  if (!sesion || sesion.expira < Date.now()) {
    if (sesion) db.prepare("DELETE FROM sesiones WHERE token = ?").run(token);
    return res.status(401).json({ error: "Debes iniciar sesión como administrador." });
  }

  req.usuario = { id: sesion.id, usuario: sesion.usuario };
  req.token = token;
  next();
}

app.post("/api/auth/login", (req, res) => {
  const { usuario = "", contrasena = "" } = req.body || {};
  const encontrado = db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario.trim());

  if (!encontrado || !contrasenaValida(contrasena, encontrado.sal, encontrado.hash)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sesiones (token, usuario_id, expira) VALUES (?, ?, ?)").run(
    token,
    encontrado.id,
    Date.now() + DURACION_SESION_MS
  );
  res.json({ token, usuario: encontrado.usuario });
});

app.get("/api/auth/sesion", requiereAdmin, (req, res) => {
  res.json({ usuario: req.usuario.usuario });
});

app.post("/api/auth/logout", requiereAdmin, (req, res) => {
  db.prepare("DELETE FROM sesiones WHERE token = ?").run(req.token);
  res.status(204).end();
});

// ==========================================
// CRUD de productos
// ==========================================

// Revisa los datos que llegan del formulario y devuelve { errores, producto }.
function validarProducto(datos) {
  const errores = {};
  const producto = {
    nombre: String(datos.nombre || "").trim(),
    categoria: String(datos.categoria || "").trim(),
    marca: String(datos.marca || "").trim(),
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    imagen: String(datos.imagen || "").trim(),
    specUrl: String(datos.specUrl || "").trim(),
  };

  if (producto.nombre.length < 3) errores.nombre = "El nombre debe tener al menos 3 caracteres.";
  if (!CATEGORIAS_VALIDAS.includes(producto.categoria)) errores.categoria = "Selecciona una categoría válida.";
  if (producto.marca.length < 2) errores.marca = "La marca es obligatoria.";
  if (!Number.isInteger(producto.precio) || producto.precio <= 0) errores.precio = "El precio debe ser un entero mayor a 0.";
  if (!Number.isInteger(producto.stock) || producto.stock < 0) errores.stock = "El stock debe ser un entero mayor o igual a 0.";
  if (producto.imagen && !/^https?:\/\//.test(producto.imagen)) errores.imagen = "La imagen debe ser una URL (http/https).";
  if (producto.specUrl && !/^https?:\/\//.test(producto.specUrl)) errores.specUrl = "El enlace debe ser una URL (http/https).";

  return { errores, producto };
}

// READ: todos los productos (público, lo usa la tienda).
app.get("/api/productos", (req, res) => {
  res.json(db.prepare("SELECT * FROM productos ORDER BY id").all());
});

// READ: un producto.
app.get("/api/productos/:id", (req, res) => {
  const producto = db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id);
  if (!producto) return res.status(404).json({ error: "Producto no encontrado." });
  res.json(producto);
});

// CREATE
app.post("/api/productos", requiereAdmin, (req, res) => {
  const { errores, producto } = validarProducto(req.body || {});
  if (Object.keys(errores).length > 0) return res.status(400).json({ error: "Datos inválidos.", errores });

  const resultado = db
    .prepare(
      `INSERT INTO productos (nombre, categoria, marca, precio, stock, imagen, specUrl)
       VALUES (@nombre, @categoria, @marca, @precio, @stock, @imagen, @specUrl)`
    )
    .run(producto);
  res.status(201).json(db.prepare("SELECT * FROM productos WHERE id = ?").get(resultado.lastInsertRowid));
});

// UPDATE
app.put("/api/productos/:id", requiereAdmin, (req, res) => {
  const { errores, producto } = validarProducto(req.body || {});
  if (Object.keys(errores).length > 0) return res.status(400).json({ error: "Datos inválidos.", errores });

  const resultado = db
    .prepare(
      `UPDATE productos SET nombre = @nombre, categoria = @categoria, marca = @marca, precio = @precio,
       stock = @stock, imagen = @imagen, specUrl = @specUrl WHERE id = @id`
    )
    .run({ ...producto, id: req.params.id });
  if (resultado.changes === 0) return res.status(404).json({ error: "Producto no encontrado." });
  res.json(db.prepare("SELECT * FROM productos WHERE id = ?").get(req.params.id));
});

// DELETE
app.delete("/api/productos/:id", requiereAdmin, (req, res) => {
  const resultado = db.prepare("DELETE FROM productos WHERE id = ?").run(req.params.id);
  if (resultado.changes === 0) return res.status(404).json({ error: "Producto no encontrado." });
  res.status(204).end();
});

// ==========================================
// Pedidos (la compra descuenta stock en la BD)
// ==========================================

app.post("/api/pedidos", (req, res) => {
  const { codigo, cliente, email, ciudad, items } = req.body || {};
  if (!codigo || !cliente || !email || !ciudad || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "El pedido está incompleto." });
  }

  // Transacción: o se guarda todo el pedido y se descuenta el stock, o no se hace nada.
  const registrarPedido = db.transaction(() => {
    let total = 0;
    const lineas = items.map(({ id, cantidad }) => {
      const producto = db.prepare("SELECT * FROM productos WHERE id = ?").get(id);
      if (!producto) throw new Error("Uno de los productos ya no existe en la tienda.");
      if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida.");
      if (producto.stock < cantidad) {
        throw new Error(`No hay stock suficiente de ${producto.nombre} (quedan ${producto.stock}).`);
      }
      total += producto.precio * cantidad;
      return { producto, cantidad };
    });

    const { lastInsertRowid: pedidoId } = db
      .prepare("INSERT INTO pedidos (codigo, cliente, email, ciudad, total) VALUES (?, ?, ?, ?, ?)")
      .run(codigo, cliente, email, ciudad, total);

    lineas.forEach(({ producto, cantidad }) => {
      db.prepare(
        "INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)"
      ).run(pedidoId, producto.id, producto.nombre, producto.precio, cantidad);
      db.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?").run(cantidad, producto.id);
    });

    return { id: pedidoId, codigo, total };
  });

  try {
    res.status(201).json(registrarPedido());
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
});

app.get("/api/pedidos", requiereAdmin, (req, res) => {
  const pedidos = db.prepare("SELECT * FROM pedidos ORDER BY id DESC LIMIT 20").all();
  const itemsDe = db.prepare("SELECT nombre, precio, cantidad FROM pedido_items WHERE pedido_id = ?");
  res.json(pedidos.map((pedido) => ({ ...pedido, items: itemsDe.all(pedido.id) })));
});

// ==========================================
// Estadísticas del panel de administración (valor agregado)
// ==========================================

app.get("/api/estadisticas", requiereAdmin, (req, res) => {
  const inventario = db
    .prepare(
      `SELECT COUNT(*) AS productos, COALESCE(SUM(stock), 0) AS unidades,
              COALESCE(SUM(precio * stock), 0) AS valorInventario,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS agotados
       FROM productos`
    )
    .get();
  const ventas = db
    .prepare("SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ingresos FROM pedidos")
    .get();
  const stockBajo = db
    .prepare("SELECT id, nombre, stock FROM productos WHERE stock <= 3 ORDER BY stock, nombre")
    .all();
  const porCategoria = db
    .prepare("SELECT categoria, COUNT(*) AS cantidad, SUM(stock) AS unidades FROM productos GROUP BY categoria ORDER BY categoria")
    .all();
  const masVendidos = db
    .prepare(
      `SELECT nombre, SUM(cantidad) AS unidades, SUM(precio * cantidad) AS ingresos
       FROM pedido_items GROUP BY nombre ORDER BY unidades DESC LIMIT 5`
    )
    .all();

  res.json({ inventario, ventas, stockBajo, porCategoria, masVendidos });
});

app.listen(PUERTO, () => {
  console.log(`API de MEGABYTE escuchando en http://localhost:${PUERTO}`);
});
