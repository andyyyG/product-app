const { validarProducto } = require('../validaciones/validarProducto');

describe('validarProducto', () => {

    const productoValido = {
        nombre: 'Laptop HP Pavilion',
        precio: 12999.99,
        descripcion: 'Laptop de alto rendimiento',
        cantidad: 10,
        imagen_url: 'https://images.unsplash.com/photo.jpg',
    };

    // ===== PRODUCTO VÁLIDO =====
    test('acepta un producto completamente válido', () => {
        const errores = validarProducto(productoValido);
        expect(errores).toHaveLength(0);
    });

    // ===== NOMBRE =====
    test('rechaza nombre vacío', () => {
        const errores = validarProducto({ ...productoValido, nombre: '' });
        expect(errores.some(e => e.includes('nombre'))).toBe(true);
    });

    test('rechaza nombre con comilla simple', () => {
        const errores = validarProducto({ ...productoValido, nombre: "Laptop HP's" });
        expect(errores.some(e => e.includes('nombre'))).toBe(true);
    });

    test('rechaza nombre con comilla doble', () => {
        const errores = validarProducto({ ...productoValido, nombre: 'Laptop "HP"' });
        expect(errores.some(e => e.includes('nombre'))).toBe(true);
    });

    test('rechaza nombre con acento grave', () => {
        const errores = validarProducto({ ...productoValido, nombre: 'Laptop `HP`' });
        expect(errores.some(e => e.includes('nombre'))).toBe(true);
    });

    // ===== PRECIO =====
    test('rechaza precio negativo', () => {
        const errores = validarProducto({ ...productoValido, precio: -100 });
        expect(errores.some(e => e.includes('precio'))).toBe(true);
    });

    test('rechaza precio no numérico', () => {
        const errores = validarProducto({ ...productoValido, precio: 'abc' });
        expect(errores.some(e => e.includes('precio'))).toBe(true);
    });

    test('acepta precio con decimales', () => {
        const errores = validarProducto({ ...productoValido, precio: 99.99 });
        expect(errores).toHaveLength(0);
    });

    test('acepta precio cero', () => {
        const errores = validarProducto({ ...productoValido, precio: 0 });
        expect(errores).toHaveLength(0);
    });

    // ===== DESCRIPCIÓN =====
    test('rechaza descripción vacía', () => {
        const errores = validarProducto({ ...productoValido, descripcion: '' });
        expect(errores.some(e => e.includes('descripcion'))).toBe(true);
    });

    test('rechaza descripción con caracteres prohibidos', () => {
        const errores = validarProducto({ ...productoValido, descripcion: 'Producto "especial"' });
        expect(errores.some(e => e.includes('descripcion'))).toBe(true);
    });

    // ===== CANTIDAD =====
    test('rechaza cantidad negativa', () => {
        const errores = validarProducto({ ...productoValido, cantidad: -5 });
        expect(errores.some(e => e.includes('cantidad'))).toBe(true);
    });

    test('rechaza cantidad decimal', () => {
        const errores = validarProducto({ ...productoValido, cantidad: 3.5 });
        expect(errores.some(e => e.includes('cantidad'))).toBe(true);
    });

    test('rechaza cantidad no numérica', () => {
        const errores = validarProducto({ ...productoValido, cantidad: 'diez' });
        expect(errores.some(e => e.includes('cantidad'))).toBe(true);
    });

    test('acepta cantidad cero', () => {
        const errores = validarProducto({ ...productoValido, cantidad: 0 });
        expect(errores).toHaveLength(0);
    });

    // ===== URL IMAGEN =====
    test('rechaza URL sin protocolo', () => {
        const errores = validarProducto({ ...productoValido, imagen_url: 'images.com/foto.jpg' });
        expect(errores.some(e => e.includes('imagen_url'))).toBe(true);
    });

    test('rechaza URL con protocolo inválido', () => {
        const errores = validarProducto({ ...productoValido, imagen_url: 'ftp://images.com/foto.jpg' });
        expect(errores.some(e => e.includes('imagen_url'))).toBe(true);
    });

    test('rechaza URL vacía', () => {
        const errores = validarProducto({ ...productoValido, imagen_url: '' });
        expect(errores.some(e => e.includes('imagen_url'))).toBe(true);
    });

    test('acepta URL con http', () => {
        const errores = validarProducto({ ...productoValido, imagen_url: 'http://images.com/foto.jpg' });
        expect(errores).toHaveLength(0);
    });

    test('acepta URL con https', () => {
        const errores = validarProducto({ ...productoValido, imagen_url: 'https://images.com/foto.jpg' });
        expect(errores).toHaveLength(0);
    });

    // ===== MÚLTIPLES ERRORES =====
    test('detecta múltiples errores a la vez', () => {
        const errores = validarProducto({
            nombre: '',
            precio: -1,
            descripcion: '',
            cantidad: 2.5,
            imagen_url: 'no-es-url',
        });
        expect(errores.length).toBeGreaterThanOrEqual(4);
    });
});