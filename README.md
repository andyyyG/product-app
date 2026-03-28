# Gestor de Productos

**Aspirante:** Andrea Gómez Franco

Aplicación web para cargar catálogos de productos desde archivos Excel, visualizarlos en tarjetas interactivas y editarlos en tiempo real.

---

## Tecnologías utilizadas

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Base de datos:** MySQL
- **Librerías principales:** ExcelJS, Multer, Axios, XLSX

---

## Requisitos previos

- Node.js v18 o superior
- npm v9 o superior
- MySQL 8.0 o superior

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone <https://github.com/andyyyG/product-app.git>
cd product-app
```

### 2. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 3. Instalar dependencias del frontend
```bash
cd ../frontend
npm install
```

---

## Configuración de base de datos

### 1. Crear la base de datos y tablas

Conéctate a MySQL y ejecuta el siguiente script:
```sql
CREATE DATABASE IF NOT EXISTS productos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE productos_db;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad INT NOT NULL,
    imagen_url VARCHAR(500) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE productos ADD CONSTRAINT nombre_unico UNIQUE (nombre);

CREATE TABLE IF NOT EXISTS cargas_excel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hash_archivo VARCHAR(32) NOT NULL UNIQUE,
    nombre_archivo VARCHAR(255),
    productos_procesados INT DEFAULT 0,
    cargado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Configurar credenciales

Crea el archivo `backend/.env` con tus credenciales:
```env
PUERTO=3001
DB_HOST=localhost
DB_USUARIO=root
DB_CONTRASENA=tu_contrasena_aqui
DB_NOMBRE=productos_db
```

---

## Correr el proyecto

El proyecto requiere dos terminales abiertas simultáneamente.

### Terminal 1: Backend
```bash
cd backend
node index.js
```

Deberías ver:
```
Servidor corriendo en http://localhost:3001
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Deberías ver:
```
VITE ready in xxx ms
➜  Local: http://localhost:5173/
```

Abre **http://localhost:5173** en tu navegador.

---

## Correr pruebas
```bash
cd backend
npm test
```

---

## Estructura del proyecto
```
product-app/
├── backend/
│   ├── config/
│   │   └── baseDatos.js        # Conexión a MySQL
│   ├── rutas/
│   │   └── productos.js        # Endpoints de la API
│   ├── validaciones/
│   │   └── validarProducto.js  # Lógica de validación del backend
│   ├── test/
│   │   └── validarProducto.test.js
│   ├── .env                    # Variables de entorno (no incluido en repo)
│   └── index.js                # Punto de entrada del servidor
└── frontend/
    └── src/
        ├── api/
        │   └── productos.js    # Llamadas al backend
        ├── componentes/
        │   ├── CargaExcel.jsx
        │   ├── VistaPrevia.jsx
        │   ├── PantallaConflictos.jsx
        │   ├── TarjetaProducto.jsx
        │   ├── ModalEdicion.jsx
        │   └── ModalErrores.jsx
        ├── utils/
        │   └── validarProductos.js  # Validación en frontend
        └── App.jsx
```

---

## Formato del archivo Excel

El archivo debe contener las siguientes columnas en este orden:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| 1 | Texto | Nombre del producto |
| 2 | Número | Precio |
| 3 | Texto | Descripción |
| 4 | Entero | Cantidad disponible |
| 5 | URL | Link de imagen del producto |

> Los nombres de los encabezados no importan, el sistema lee por posición de columna.

---

## Funcionalidades principales

- Carga de archivos Excel con drag & drop o selección manual
- Vista previa editable del Excel antes de confirmar la carga
- Validación en dos capas: frontend (UX inmediata) y backend (seguridad)
- Control de caracteres no permitidos: `'  "  \`  ´  ¨`
- Verificación real de accesibilidad de URLs de imagen
- Detección de productos duplicados con similitud de nombre (~65%)
- Manejo de conflictos: el usuario decide si suma stock o crea producto nuevo
- Visualización de productos en tarjetas con manejo de imágenes rotas
- Búsqueda en tiempo real por nombre, descripción o precio
- Edición y eliminación de productos con confirmación
- Idempotencia: el mismo archivo no se puede cargar dos veces
- Pruebas unitarias de validación con Jest (21 pruebas)

---

## Observaciones

- El sistema acumula productos de múltiples Excels en el catálogo, no reemplaza.
- Si un producto del Excel tiene nombre similar al 65% o más a uno existente, el sistema lo detecta como posible duplicado.
- La validación del backend es independiente del frontend, las peticiones directas a la API también son validadas.
- El archivo `.env` no está incluido en el repositorio por seguridad. Debe crearse manualmente siguiendo el ejemplo de arriba.

---

```
# Dependencias
node_modules/

# Variables de entorno
.env

# Vite build
dist/

# Logs
*.log
