# MEGABYTE — Tienda de hardware para PC gaming

E-commerce hecho en **React** con un backend propio en **Node.js + Express** conectado a una base de datos **SQLite**.

## Cómo ejecutarlo

Requisito: tener instalado [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm run dev
```

`npm run dev` arranca dos cosas a la vez:

| Parte | Dirección | Qué es |
|---|---|---|
| `api` | http://localhost:4000 | Servidor Express + base de datos SQLite (carpeta `server/`) |
| `web` | http://localhost:3000 | La tienda en React (se abre en el navegador) |

La primera vez que arranca, el servidor crea solo el archivo `server/megabyte.db` y lo llena con los 40 productos iniciales.
Para empezar con la base de datos limpia, basta con borrar ese archivo y volver a ejecutar `npm run dev`.

### Acceso de administrador

En la pestaña **Administración** de la tienda:

- Usuario: `admin`
- Contraseña: `megabyte123`

(Se pueden cambiar con las variables de entorno `ADMIN_USUARIO` y `ADMIN_CONTRASENA` antes de crear la base de datos).

## Qué incluye cada entrega

### Primer corte
- Catálogo de productos por categorías, búsqueda y carrito de compras.
- Formulario de facturación con validaciones y factura en PDF (`jspdf`).

### Segundo corte
- Filtros avanzados (marca, precio máximo, solo con stock, orden).
- Menú de secciones, opiniones de clientes e historial de compras.
- Drag and drop de productos al carrito.
- Conversor a dólares con una API externa (`open.er-api.com`).
- Persistencia en LocalStorage con un hook propio (`useLocalStorage`).

### Tercer corte
**Aplicación conectada a una base de datos con CRUD**
- El catálogo ya no está escrito en el código: se lee de SQLite a través de la API.
- Desde el panel de administración se pueden **crear, consultar, editar y eliminar** productos.
- **Borrado lógico**: lo eliminado va a una papelera y se puede restaurar.
- Validaciones en el formulario (frontend) y también en el servidor (backend).
- Al confirmar una compra, el pedido se guarda en la BD y el stock se descuenta en una **transacción**: si no hay stock suficiente no se registra nada y no se descarga la factura.

**Valor agregado**
- **Login de administrador**: las rutas que modifican datos están protegidas con un token de sesión. Las contraseñas se guardan con hash `scrypt` y sal aleatoria, nunca en texto plano.
- **Panel de estadísticas** calculado con consultas SQL: total de productos y unidades, valor del inventario, pedidos e ingresos, unidades por categoría, alertas de stock bajo, productos más vendidos y últimos pedidos.

## Base de datos

| Tabla | Para qué sirve |
|---|---|
| `productos` | Catálogo (nombre, categoría, marca, precio, stock, imagen, enlace de características, `eliminado_en`) |
| `usuarios` | Administradores (usuario, sal y hash de la contraseña) |
| `sesiones` | Tokens de sesión activos y su vencimiento |
| `pedidos` | Compras realizadas (código, cliente, ciudad, total, fecha) |
| `pedido_items` | Productos de cada pedido (cantidad y precio al momento de la compra) |
| `actividad` | Bitácora del CRUD: cada CREATE, READ, UPDATE y DELETE de productos con fecha y detalle |

Los INSERT, UPDATE y DELETE sobre `productos` los anotan **triggers** de la propia base de datos
(`productos_creado`, `productos_editado`, `productos_borrado_logico`, `productos_restaurado`, `productos_eliminado`). Las lecturas (READ) las anota la API,
porque SQLite no tiene triggers para SELECT.

### Borrado lógico

Eliminar un producto **no borra la fila**: se guarda la fecha en la columna `eliminado_en` y el producto pasa a la **Papelera**
del panel de administración, desde donde se puede **restaurar**.

- `eliminado_en IS NULL` → producto activo (se ve en la tienda).
- `eliminado_en` con fecha → producto en la papelera (la tienda, los pedidos y las estadísticas lo ignoran).
- Ventaja: no se pierde información y los pedidos antiguos conservan la referencia al producto.

```sql
-- Lo que hace la API al "eliminar"
UPDATE productos SET eliminado_en = datetime('now', 'localtime') WHERE id = ? AND eliminado_en IS NULL;
-- Lo que hace al restaurar
UPDATE productos SET eliminado_en = NULL WHERE id = ?;
```

Si la base de datos se creó antes de esta función, el servidor agrega la columna solo al arrancar, sin perder datos.

### Ver la base de datos con DB Browser for SQLite

1. Instala [DB Browser for SQLite](https://sqlitebrowser.org/dl/).
2. Arranca la app con `npm run dev` (así se crea `server/megabyte.db`).
3. En DB Browser: **Abrir base de datos de solo lectura** (flechita junto a *Abrir base de datos*) y elige `server/megabyte.db`.
4. Pestaña **Hojear datos** → tabla `actividad` (o `productos`).
5. Haz algo en la tienda (crear, editar, eliminar o ver productos) y pulsa **F5** en DB Browser para ver la nueva fila.

Abrirla en solo lectura evita que DB Browser bloquee la base de datos mientras la app escribe en ella.

## API

| Método | Ruta | Protegida | Descripción |
|---|---|---|---|
| GET | `/api/productos` | No | Lista todos los productos |
| GET | `/api/productos/:id` | No | Un producto |
| POST | `/api/productos` | Sí | Crea un producto |
| PUT | `/api/productos/:id` | Sí | Edita un producto |
| DELETE | `/api/productos/:id` | Sí | Borrado lógico: envía el producto a la papelera |
| GET | `/api/productos/eliminados` | Sí | Productos en la papelera |
| PATCH | `/api/productos/:id/restaurar` | Sí | Restaura un producto de la papelera |
| POST | `/api/pedidos` | No | Registra una compra y descuenta stock |
| GET | `/api/pedidos` | Sí | Últimos pedidos |
| GET | `/api/estadisticas` | Sí | Resumen para el panel |
| POST | `/api/auth/login` | No | Inicia sesión y devuelve el token |
| GET | `/api/auth/sesion` | Sí | Comprueba si el token sigue vigente |
| POST | `/api/auth/logout` | Sí | Cierra la sesión |

Las rutas protegidas esperan la cabecera `Authorization: Bearer <token>`.

## Estructura

```
server/
  index.js            Rutas de la API (CRUD, pedidos, login, estadísticas)
  db.js               Conexión a SQLite, creación de tablas y datos iniciales
  datosIniciales.js   Los 40 productos con los que arranca la BD
src/
  App.js              Estado global: productos (desde la API), carrito, filtros
  services/api.js     Funciones que llaman a la API
  components/
    StoreLayout.js    Estructura de la tienda (catálogo, carrito, facturación)
    admin/            Login, formulario de producto, tabla y estadísticas
  TerceraEntrega.css  Estilos del panel de administración
```

## Scripts

- `npm run dev`: API + tienda a la vez (lo normal para trabajar).
- `npm run server`: solo la API.
- `npm start`: solo la tienda (necesita la API corriendo para cargar productos).
- `npm test`: pruebas.
- `npm run build`: versión de producción de la tienda.
