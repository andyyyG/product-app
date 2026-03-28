const CARACTERES_PROHIBIDOS = /['"`´¨<>^{}]/;

export function esUrlValida(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

export function validarFilas(filas) {
    const errores = [];
    filas.forEach((fila, indice) => {
        const numeroFila = indice + 2;
        const erroresFila = [];

        if (!fila.nombre || fila.nombre.trim() === '') {
            erroresFila.push('Nombre: campo obligatorio.');
        } else if (CARACTERES_PROHIBIDOS.test(fila.nombre)) {
            erroresFila.push('Nombre: contiene caracteres no permitidos.');
        }

        const precio = parseFloat(fila.precio);
        if (fila.precio === '' || fila.precio === null || fila.precio === undefined) {
            erroresFila.push('Precio: campo obligatorio.');
        } else if (isNaN(precio) || precio < 0) {
            erroresFila.push('Precio: debe ser un número positivo.');
        } else if (CARACTERES_PROHIBIDOS.test(String(fila.precio))) {
            erroresFila.push('Precio: contiene caracteres no permitidos.');
        }

        if (!fila.descripcion || fila.descripcion.trim() === '') {
            erroresFila.push('Descripción: campo obligatorio.');
        } else if (CARACTERES_PROHIBIDOS.test(fila.descripcion)) {
            erroresFila.push('Descripción: contiene caracteres no permitidos.');
        }

        const cantidad = Number(fila.cantidad);
        if (fila.cantidad === '' || fila.cantidad === null || fila.cantidad === undefined) {
            erroresFila.push('Cantidad: campo obligatorio.');
        } else if (isNaN(cantidad) || cantidad < 0 || !Number.isInteger(cantidad)) {
            erroresFila.push('Cantidad: debe ser un número entero positivo.');
        }

        if (!fila.imagen_url || fila.imagen_url.trim() === '') {
            erroresFila.push('URL imagen: campo obligatorio.');
        } else if (CARACTERES_PROHIBIDOS.test(fila.imagen_url)) {
            erroresFila.push('URL imagen: contiene caracteres no permitidos.');
        } else if (!esUrlValida(fila.imagen_url)) {
            erroresFila.push('URL imagen: no es una URL válida (debe iniciar con http o https).');
        }

        if (erroresFila.length > 0) {
            errores.push({ fila: numeroFila, indice, errores: erroresFila });
        }
    });
    return errores;
}