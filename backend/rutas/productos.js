const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const pool = require('../config/baseDatos');
const { validarProducto, verificarImagenUrl } = require('../validaciones/validarProducto');

const enrutador = express.Router();
const almacenamiento = multer({ storage: multer.memoryStorage() });

enrutador.post('/cargar-excel', almacenamiento.single('archivo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se recibió ningún archivo.' });
    }

    // Generamos un hash del contenido del archivo para detectar duplicados
    const hashArchivo = crypto
        .createHash('md5')
        .update(req.file.buffer)
        .digest('hex');

    const conexion = await pool.getConnection();

    try {
        // Verificamos si este archivo exacto ya fue procesado antes
        const [cargaExistente] = await conexion.query(
            'SELECT id, cargado_en FROM cargas_excel WHERE hash_archivo = ?',
            [hashArchivo]
        );

        if (cargaExistente.length > 0) {
            conexion.release();
            const fecha = new Date(cargaExistente[0].cargado_en).toLocaleString('es-MX');
            return res.status(409).json({
                mensaje: `Este archivo ya fue procesado el ${fecha}. Si deseas actualizar productos, modifica el archivo antes de subirlo.`,
            });
        }

        // Parseamos el Excel
        const libro = new ExcelJS.Workbook();
        await libro.xlsx.load(req.file.buffer);
        const hoja = libro.worksheets[0];

        const productosValidos = [];
        const erroresPorFila = [];
        const verificaciones = [];

        hoja.eachRow((fila, numeroFila) => {
            if (numeroFila === 1) return;

            // Leemos por posición, (nombre, precio, descripción, cantidad, imagen_url))
            function leerCelda(col) {
                const celda = fila.getCell(col);
                const val = celda.value;
                if (val === null || val === undefined) return '';
                // Texto enriquecido (negrita, links, etc.)
                if (typeof val === 'object' && val.richText) {
                    return val.richText.map(r => r.text).join('').trim();
                }
                // Hipervínculo (cuando la celda tiene un link)
                if (typeof val === 'object' && val.text) {
                    return String(val.text).trim();
                }
                return String(val).trim();
            }

            const producto = {
                nombre: leerCelda(1),
                precio: fila.getCell(2).value,
                descripcion: leerCelda(3),
                cantidad: fila.getCell(4).value,
                imagen_url: leerCelda(5),
            };

            const errores = validarProducto(producto);
            verificaciones.push({ numeroFila, producto, errores });
        });

        // Verificamos imágenes en paralelo
        await Promise.all(
            verificaciones.map(async (item) => {
                if (item.errores.length === 0) {
                    const errorImagen = await verificarImagenUrl(item.producto.imagen_url);
                    if (errorImagen) {
                        item.errores.push(`imagen_url: ${errorImagen}`);
                    }
                }
            })
        );

        for (const item of verificaciones) {
            if (item.errores.length > 0) {
                erroresPorFila.push({ fila: item.numeroFila, errores: item.errores });
            } else {
                productosValidos.push(item.producto);
            }
        }

        if (erroresPorFila.length > 0) {
            conexion.release();
            return res.status(422).json({
                mensaje: 'El archivo contiene errores de validación.',
                errores: erroresPorFila,
            });
        }

        // Usamos transacción para que todo se guarde junto o nada
        await conexion.beginTransaction();

        try {
            // UPSERT: inserta si no existe, actualiza si el nombre ya está
            // Decisiones del usuario para cada producto:
            // { "Laptop HP": "sumar_cantidad" | "nuevo_producto" }
            // Para nuevo_producto puede venir con nombre cambiado
            // { "Laptop HP": { accion: "nuevo_producto", nombreFinal: "Laptop HP v2" } }
            const decisiones = JSON.parse(req.body.decisiones || '{}');

            for (const producto of productosValidos) {
                const nombreOriginal = producto.nombre;
                const decision = decisiones[nombreOriginal];

                if (!decision || decision === 'nuevo' || decision === 'insertar') {
                    // Producto nuevo sin conflicto: UPSERT normal
                    await conexion.query(
                        `INSERT INTO productos (nombre, precio, descripcion, cantidad, imagen_url)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                        precio = VALUES(precio),
                        descripcion = VALUES(descripcion),
                        cantidad = VALUES(cantidad),
                        imagen_url = VALUES(imagen_url),
                        actualizado_en = CURRENT_TIMESTAMP`,
                        [producto.nombre, producto.precio, producto.descripcion,
                        producto.cantidad, producto.imagen_url]
                    );

                } else if (decision === 'sumar_cantidad') {
                    // Solo sumamos la cantidad al existente
                    await conexion.query(
                        `UPDATE productos 
                        SET cantidad = cantidad + ?, actualizado_en = CURRENT_TIMESTAMP
                        WHERE nombre = ?`,
                        [producto.cantidad, nombreOriginal]
                    );

                } else if (decision?.accion === 'nuevo_producto') {
                    // Crear como producto nuevo, posiblemente con nombre distinto
                    const nombreFinal = decision.nombreFinal?.trim() || nombreOriginal;
                    await conexion.query(
                        `INSERT INTO productos (nombre, precio, descripcion, cantidad, imagen_url)
             VALUES (?, ?, ?, ?, ?)`,
                        [nombreFinal, producto.precio, producto.descripcion,
                            producto.cantidad, producto.imagen_url]
                    );
                }
            }

            // Registramos la carga para evitar que se suba el mismo archivo dos veces
            await conexion.query(
                'INSERT INTO cargas_excel (hash_archivo, nombre_archivo, productos_procesados) VALUES (?, ?, ?)',
                [hashArchivo, req.file.originalname, productosValidos.length]
            );

            await conexion.commit();
            conexion.release();

            return res.status(200).json({
                mensaje: `${productosValidos.length} productos agregados o actualizados correctamente.`,
            });

        } catch (errorTransaccion) {
            await conexion.rollback();
            conexion.release();
            throw errorTransaccion;
        }

    } catch (error) {
        console.error(error);
        if (conexion) conexion.release();
        return res.status(500).json({ mensaje: 'Error al procesar el archivo Excel.' });
    }
});

enrutador.get('/', async (req, res) => {
    try {
        const [filas] = await pool.query('SELECT * FROM productos ORDER BY id ASC');
        return res.status(200).json(filas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error al obtener los productos.' });
    }
});

enrutador.put('/:id', async (req, res) => {
    const { id } = req.params;
    const producto = req.body;

    const errores = validarProducto(producto);
    if (errores.length > 0) {
        return res.status(422).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        const [resultado] = await pool.query(
            'UPDATE productos SET nombre=?, precio=?, descripcion=?, cantidad=?, imagen_url=? WHERE id=?',
            [producto.nombre, producto.precio, producto.descripcion, producto.cantidad, producto.imagen_url, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        return res.status(200).json({ mensaje: 'Producto actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error al actualizar el producto.' });
    }
});

// DELETE /api/productos/:id
enrutador.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query(
            'DELETE FROM productos WHERE id = ?', [id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }
        return res.status(200).json({ mensaje: 'Producto eliminado correctamente.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error al eliminar el producto.' });
    }
});

// Calcula qué tan similares son dos strings (0 = nada similar, 1 = idénticos), esto para usarse al identificar 
// productos ya existentesen catalogo
function similitud(a, b) {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // --- Métrica 1: Levenshtein normalizado ---
    const matriz = Array.from({ length: s1.length + 1 }, (_, i) =>
        Array.from({ length: s2.length + 1 }, (_, j) =>
            i === 0 ? j : j === 0 ? i : 0
        )
    );
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                matriz[i][j] = matriz[i - 1][j - 1];
            } else {
                matriz[i][j] = 1 + Math.min(
                    matriz[i - 1][j],
                    matriz[i][j - 1],
                    matriz[i - 1][j - 1]
                );
            }
        }
    }
    const scoreLevenshtein = 1 - matriz[s1.length][s2.length] / Math.max(s1.length, s2.length);

    // --- Métrica 2: tokens en común ---
    // Cuántas palabras comparten los dos nombres
    const tokens1 = new Set(s1.split(/[\s\-_]+/).filter(t => t.length > 1));
    const tokens2 = new Set(s2.split(/[\s\-_]+/).filter(t => t.length > 1));
    const enComun = [...tokens1].filter(t => tokens2.has(t)).length;
    const totalTokens = Math.max(tokens1.size, tokens2.size);
    const scoreTokens = totalTokens > 0 ? enComun / totalTokens : 0;

    // --- Combinación: 40% Levenshtein + 60% tokens ---
    // Damos más peso a tokens porque "Sony WH-1000XM5" en común
    // es más relevante que la diferencia "auriculares" vs "audifonos"
    return scoreLevenshtein * 0.4 + scoreTokens * 0.6;
}

// POST /api/productos/verificar-conflictos
enrutador.post('/verificar-conflictos', express.json(), async (req, res) => {
    const { productos } = req.body;
    if (!productos || !Array.isArray(productos)) {
        return res.status(400).json({ mensaje: 'Lista de productos inválida.' });
    }

    try {
        // Traemos TODOS los productos del catálogo para comparar similitud
        const [todosCatalogo] = await pool.query(
            'SELECT id, nombre, precio, descripcion, cantidad, imagen_url FROM productos'
        );

        const resultado = productos.map(p => {
            const nombreEntrante = String(p.nombre).trim();

            // Primero buscamos coincidencia exacta
            let existente = todosCatalogo.find(
                c => c.nombre.trim().toLowerCase() === nombreEntrante.toLowerCase()
            );
            let esSimilar = false;
            let porcentajeSimilitud = 1;

            // Si no hay exacta, buscamos similar con umbral del 80%
            if (!existente) {
                let mejorSimilitud = 0;
                let mejorCandidato = null;

                todosCatalogo.forEach(c => {
                    const score = similitud(nombreEntrante, c.nombre);
                    if (score > mejorSimilitud) {
                        mejorSimilitud = score;
                        mejorCandidato = c;
                    }
                });

                if (mejorSimilitud >= 0.65) {
                    existente = mejorCandidato;
                    esSimilar = true;
                    porcentajeSimilitud = mejorSimilitud;
                }
            }

            if (!existente) {
                return { tipo: 'nuevo', entrante: p };
            }

            const precioCambio = parseFloat(existente.precio) !== parseFloat(p.precio);
            const descripcionCambio = existente.descripcion?.trim() !== String(p.descripcion).trim();
            const imagenCambio = existente.imagen_url?.trim() !== String(p.imagen_url).trim();

            if (!precioCambio && !descripcionCambio && !imagenCambio) {
                return {
                    tipo: 'sumar_cantidad',
                    entrante: p,
                    existente,
                    esSimilar,
                    porcentajeSimilitud: Math.round(porcentajeSimilitud * 100),
                };
            }

            return {
                tipo: 'conflicto',
                entrante: p,
                existente,
                esSimilar,
                porcentajeSimilitud: Math.round(porcentajeSimilitud * 100),
                diferencias: { precioCambio, descripcionCambio, imagenCambio },
            };
        });

        return res.status(200).json({ resultado });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error al verificar conflictos.' });
    }
});

// POST /api/productos/verificar-imagenes
enrutador.post('/verificar-imagenes', express.json(), async (req, res) => {
    const { imagenes } = req.body;
    if (!Array.isArray(imagenes)) {
        return res.status(400).json({ mensaje: 'Lista de imágenes inválida.' });
    }

    const resultados = await Promise.all(
        imagenes.map(async ({ fila, url }) => {
            const error = await verificarImagenUrl(url);
            return error ? { fila, errores: [`URL imagen: ${error}`] } : null;
        })
    );

    const errores = resultados.filter(Boolean);
    return res.status(200).json({ errores });
});

module.exports = enrutador;