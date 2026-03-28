import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/productos';

export async function cargarExcel(archivo, decisiones = {}) {
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    formulario.append('decisiones', JSON.stringify(decisiones));
    const respuesta = await axios.post(`${BASE_URL}/cargar-excel`, formulario);
    return respuesta.data;
}

export async function obtenerProductos() {
    const respuesta = await axios.get(BASE_URL);
    return respuesta.data;
}

export async function actualizarProducto(id, datos) {
    const respuesta = await axios.put(`${BASE_URL}/${id}`, datos);
    return respuesta.data;
}

export async function eliminarProducto(id) {
    const respuesta = await axios.delete(`${BASE_URL}/${id}`);
    return respuesta.data;
}

export async function verificarConflictos(productos) {
    const respuesta = await axios.post(`${BASE_URL}/verificar-conflictos`, { productos });
    return respuesta.data;
}

export async function verificarImagenes(imagenes) {
    const respuesta = await axios.post(`${BASE_URL}/verificar-imagenes`, { imagenes });
    return respuesta.data;
}