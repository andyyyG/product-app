const https = require('https');
const http = require('http');

const CARACTERES_PROHIBIDOS = /['"`´¨<>^{}]/;

function validarTexto(valor, campo) {
    if (!valor || typeof valor !== 'string' || valor.trim() === '') {
        return `El campo "${campo}" es obligatorio y debe ser texto válido.`;
    }
    if (CARACTERES_PROHIBIDOS.test(valor)) {
        return `El campo "${campo}" contiene caracteres no permitidos (' " \` ´ ¨ < > ^).`;
    }
    return null;
}

function validarPrecio(valor) {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0) {
        return `El campo "precio" debe ser un número positivo.`;
    }
    return null;
}

function validarCantidad(valor) {
    const num = parseInt(valor);
    if (isNaN(num) || num < 0 || !Number.isInteger(Number(valor))) {
        return `El campo "cantidad" debe ser un número entero positivo.`;
    }
    return null;
}

function validarEstructuraUrl(valor) {
    if (!valor || typeof valor !== 'string' || valor.trim() === '') {
        return `El campo "imagen_url" es obligatorio.`;
    }
    if (CARACTERES_PROHIBIDOS.test(valor)) {
        return `El campo "imagen_url" contiene caracteres no permitidos.`;
    }
    try {
        const url = new URL(valor);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return `El campo "imagen_url" debe comenzar con http o https.`;
        }
  
        if (!url.hostname || url.hostname.trim() === '') {
            return `El campo "imagen_url" no es una URL válida.`;
        }
        return null;
    } catch {
        return `El campo "imagen_url" no es una URL válida.`;
    }
}

// Verifica que la URL responda y sea una imagen real
function verificarImagenUrl(url) {
    return new Promise((resolve) => {
        const protocolo = url.startsWith('https') ? https : http;
        const timeout = setTimeout(() => resolve('La imagen no respondió a tiempo (timeout).'), 7000);

        try {
            const peticion = protocolo.request(url, { method: 'HEAD' }, (respuesta) => {
                clearTimeout(timeout);
                const tipo = respuesta.headers['content-type'] || '';
                const esImagen = tipo.startsWith('image/');
                const codigoOk = respuesta.statusCode >= 200 && respuesta.statusCode < 400;

                if (!codigoOk) {
                    resolve(`La imagen no está disponible (código ${respuesta.statusCode}).`);
                } else if (!esImagen) {
                    resolve(`La URL no apunta a una imagen (tipo: ${tipo || 'desconocido'}).`);
                } else {
                    resolve(null);
                }
            });

            peticion.on('error', () => {
                clearTimeout(timeout);
                resolve('No se pudo conectar a la URL de la imagen.');
            });

            peticion.end();
        } catch {
            clearTimeout(timeout);
            resolve('URL de imagen inaccesible.');
        }
    });
}

function validarProducto(producto) {
    const errores = [];

    const errorNombre = validarTexto(producto.nombre, 'nombre');
    if (errorNombre) errores.push(errorNombre);

    const errorDescripcion = validarTexto(producto.descripcion, 'descripcion');
    if (errorDescripcion) errores.push(errorDescripcion);

    const errorPrecio = validarPrecio(producto.precio);
    if (errorPrecio) errores.push(errorPrecio);

    const errorCantidad = validarCantidad(producto.cantidad);
    if (errorCantidad) errores.push(errorCantidad);

    const errorUrl = validarEstructuraUrl(producto.imagen_url);
    if (errorUrl) errores.push(errorUrl);

    return errores;
}

module.exports = { validarProducto, verificarImagenUrl };