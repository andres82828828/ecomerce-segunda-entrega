const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { catalogoInicial } = require("./datosIniciales");

// La base de datos es un solo archivo: server/megabyte.db (se crea solo si no existe).
const RUTA_BD = process.env.RUTA_BD || path.join(__dirname, "megabyte.db");
const db = new Database(RUTA_BD);
// Modo DELETE: cada cambio se escribe directo en megabyte.db, así DB Browser for SQLite
// lo ve al instante (con WAL quedaría un tiempo en el archivo aparte megabyte.db-wal).
db.pragma("journal_mode = DELETE");
db.pragma("foreign_keys = ON");
// Si DB Browser tiene la BD ocupada un momento, se espera hasta 5 s en vez de fallar al instante.
db.pragma("busy_timeout = 5000");

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
    specUrl   TEXT    NOT NULL DEFAULT '',
    -- Borrado lógico: NULL = producto activo; con fecha = producto en la papelera.
    eliminado_en TEXT DEFAULT NULL
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

  -- Bitácora del CRUD: una fila por cada CREATE, READ, UPDATE o DELETE de productos.
  -- Sirve para ver en DB Browser for SQLite qué operación hizo la aplicación y cuándo.
  CREATE TABLE IF NOT EXISTS actividad (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    operacion   TEXT    NOT NULL CHECK (operacion IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    tabla       TEXT    NOT NULL,
    registro_id INTEGER,
    detalle     TEXT
  );
`);

// ---------- Migración ----------
// Las bases de datos creadas antes del borrado lógico no tienen la columna: se agrega sin perder datos.
const columnasProductos = db.prepare("PRAGMA table_info(productos)").all().map((columna) => columna.name);
if (!columnasProductos.includes("eliminado_en")) {
  db.exec("ALTER TABLE productos ADD COLUMN eliminado_en TEXT DEFAULT NULL");
  console.log("Base de datos: se agregó la columna eliminado_en (borrado lógico).");
}

// ---------- Triggers ----------
// La propia base de datos anota en la bitácora los INSERT, UPDATE y DELETE sobre productos.
// (Las lecturas no disparan triggers en SQLite; esas las anota la API en server/index.js.)
// Se borran y se vuelven a crear para que una BD antigua reciba siempre la versión actual.
db.exec(`
  DROP TRIGGER IF EXISTS productos_creado;
  CREATE TRIGGER productos_creado AFTER INSERT ON productos
  BEGIN
    INSERT INTO actividad (operacion, tabla, registro_id, detalle)
    VALUES ('CREATE', 'productos', NEW.id,
            'Nuevo: ' || NEW.nombre || ' | precio ' || NEW.precio || ' | stock ' || NEW.stock);
  END;

  -- Edición normal (no cambia eliminado_en).
  DROP TRIGGER IF EXISTS productos_editado;
  CREATE TRIGGER productos_editado AFTER UPDATE ON productos
  WHEN OLD.eliminado_en IS NEW.eliminado_en
  BEGIN
    INSERT INTO actividad (operacion, tabla, registro_id, detalle)
    VALUES ('UPDATE', 'productos', NEW.id,
            OLD.nombre || ' | precio ' || OLD.precio || ' -> ' || NEW.precio ||
            ' | stock ' || OLD.stock || ' -> ' || NEW.stock ||
            CASE WHEN OLD.nombre <> NEW.nombre THEN ' | nombre -> ' || NEW.nombre ELSE '' END);
  END;

  -- Borrado lógico: el producto pasa a la papelera (la fila sigue existiendo).
  DROP TRIGGER IF EXISTS productos_borrado_logico;
  CREATE TRIGGER productos_borrado_logico AFTER UPDATE OF eliminado_en ON productos
  WHEN OLD.eliminado_en IS NULL AND NEW.eliminado_en IS NOT NULL
  BEGIN
    INSERT INTO actividad (operacion, tabla, registro_id, detalle)
    VALUES ('DELETE', 'productos', NEW.id, 'Borrado lógico (a la papelera): ' || NEW.nombre);
  END;

  -- Restauración desde la papelera.
  DROP TRIGGER IF EXISTS productos_restaurado;
  CREATE TRIGGER productos_restaurado AFTER UPDATE OF eliminado_en ON productos
  WHEN OLD.eliminado_en IS NOT NULL AND NEW.eliminado_en IS NULL
  BEGIN
    INSERT INTO actividad (operacion, tabla, registro_id, detalle)
    VALUES ('UPDATE', 'productos', NEW.id, 'Restaurado desde la papelera: ' || NEW.nombre);
  END;

  -- Borrado físico (la API ya no lo usa; queda por si se borra a mano en DB Browser).
  DROP TRIGGER IF EXISTS productos_eliminado;
  CREATE TRIGGER productos_eliminado AFTER DELETE ON productos
  BEGIN
    INSERT INTO actividad (operacion, tabla, registro_id, detalle)
    VALUES ('DELETE', 'productos', OLD.id, 'Borrado físico: ' || OLD.nombre);
  END;
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
    // La carga inicial no es una operación del usuario: se limpia de la bitácora.
    db.prepare("DELETE FROM actividad").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'actividad'").run();
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

// Anota en la bitácora una operación que no dispara trigger (las lecturas).
function registrarActividad(operacion, tabla, registroId, detalle) {
  db.prepare("INSERT INTO actividad (operacion, tabla, registro_id, detalle) VALUES (?, ?, ?, ?)").run(
    operacion,
    tabla,
    registroId,
    detalle
  );
}

module.exports = { db, contrasenaValida, registrarActividad };
