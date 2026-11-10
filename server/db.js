const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { catalogoInicial } = require("./datosIniciales");

// La base de datos es un solo archivo: server/megabyte.db (se crea solo si no existe).
const RUTA_BD = process.env.RUTA_BD || path.join(__dirname, "megabyte.db");
const db = new Database(RUTA_BD);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- Tablas ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT    NOT NULL,
    categoria TEXT    NOT NULL,
    marca     TEXT    NOT NULL,
    precio    INTEGER NOT NULL CHECK (precio > 0),
    stock     INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen    TEXT    NOT NULL DEFAULT '',
    specUrl   TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    sal     TEXT NOT NULL,
    hash    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sesiones (
    token      TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo    TEXT    NOT NULL UNIQUE,
    fecha     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    cliente   TEXT    NOT NULL,
    email     TEXT    NOT NULL,
    ciudad    TEXT    NOT NULL,
    total     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pedido_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    nombre      TEXT    NOT NULL,
    precio      INTEGER NOT NULL,
    cantidad    INTEGER NOT NULL
  );
`);

// ---------- Contraseñas ----------
// Nunca se guarda la contraseña en texto plano: se guarda una sal aleatoria y el hash scrypt.
function hashearContrasena(contrasena, sal = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(contrasena, sal, 64).toString("hex");
  return { sal, hash };
}

function contrasenaValida(contrasena, sal, hashGuardado) {
  const { hash } = hashearContrasena(contrasena, sal);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashGuardado, "hex"));
}

// ---------- Datos iniciales ----------
function sembrarDatos() {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM productos").get();
  if (total === 0) {
    const insertar = db.prepare(`
      INSERT INTO productos (id, nombre, categoria, marca, precio, stock, imagen, specUrl)
      VALUES (@id, @nombre, @categoria, @marca, @precio, @stock, @imagen, @specUrl)
    `);
    db.transaction((lista) => lista.forEach((producto) => insertar.run(producto)))(catalogoInicial);
    console.log(`Base de datos: se cargaron ${catalogoInicial.length} productos iniciales.`);
  }

  // Usuario administrador por defecto (se puede cambiar con variables de entorno).
  const usuarioAdmin = process.env.ADMIN_USUARIO || "admin";
  const existe = db.prepare("SELECT id FROM usuarios WHERE usuario = ?").get(usuarioAdmin);
  if (!existe) {
    const { sal, hash } = hashearContrasena(process.env.ADMIN_CONTRASENA || "megabyte123");
    db.prepare("INSERT INTO usuarios (usuario, sal, hash) VALUES (?, ?, ?)").run(usuarioAdmin, sal, hash);
    console.log(`Base de datos: se creó el usuario administrador "${usuarioAdmin}".`);
  }
}

sembrarDatos();

module.exports = { db, contrasenaValida };
