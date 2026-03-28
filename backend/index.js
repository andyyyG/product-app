const express = require('express');
const cors = require('cors');
require('dotenv').config();

const rutasProductos = require('./rutas/productos');

const app = express();
const PUERTO = process.env.PUERTO || 3001;

app.use(cors());
app.use(express.json());

// Todas las rutas de productos bajo /api/productos
app.use('/api/productos', rutasProductos);

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
});