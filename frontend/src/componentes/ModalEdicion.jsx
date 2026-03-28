import { useState } from 'react';
import { actualizarProducto, eliminarProducto } from '../api/productos';

export default function ModalEdicion({ producto, alCerrar, alGuardar }) {
    const [formulario, setFormulario] = useState({ ...producto });
    const [errores, setErrores] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    function alCambiar(e) {
        setFormulario({ ...formulario, [e.target.name]: e.target.value });
    }

    async function alEnviar(e) {
        e.preventDefault();
        setGuardando(true);
        setErrores([]);

        try {
            await actualizarProducto(producto.id, formulario);
            alGuardar({ ...formulario });
        } catch (error) {
            if (error.response?.data?.errores) {
                setErrores(error.response.data.errores);
            } else {
                setErrores([error.response?.data?.mensaje || 'Error al guardar.']);
            }
        } finally {
            setGuardando(false);
        }
    }

    async function alEliminar() {
        setEliminando(true);
        try {
            await eliminarProducto(producto.id);
            alGuardar(null); // null indica que fue eliminado
        } catch (error) {
            setErrores([error.response?.data?.mensaje || 'Error al eliminar.']);
            setConfirmandoEliminar(false);
        } finally {
            setEliminando(false);
        }
    }

    return (
        <div className="modal-fondo" onClick={alCerrar}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Editar producto</h2>
                <form onSubmit={alEnviar}>
                    {[
                        { etiqueta: 'Nombre', nombre: 'nombre', tipo: 'text' },
                        { etiqueta: 'Precio', nombre: 'precio', tipo: 'number' },
                        { etiqueta: 'Descripción', nombre: 'descripcion', tipo: 'text' },
                        { etiqueta: 'Cantidad', nombre: 'cantidad', tipo: 'number' },
                        { etiqueta: 'URL de imagen', nombre: 'imagen_url', tipo: 'text' },
                    ].map(({ etiqueta, nombre, tipo }) => (
                        <div key={nombre} className="campo-formulario">
                            <label>{etiqueta}</label>
                            <input
                                type={tipo}
                                name={nombre}
                                value={formulario[nombre]}
                                onChange={alCambiar}
                                required
                            />
                        </div>
                    ))}

                    {errores.length > 0 && (
                        <div className="contenedor-errores">
                            {errores.map((err, i) => <p key={i}>❌ {err}</p>)}
                        </div>
                    )}

                    <div className="modal-botones">
                        {!confirmandoEliminar ? (
                            <>
                                <button
                                    type="button"
                                    className="boton-eliminar"
                                    onClick={() => setConfirmandoEliminar(true)}
                                >
                                    Eliminar
                                </button>
                                <button type="button" className="boton-cancelar" onClick={alCerrar}>
                                    Cancelar
                                </button>
                                <button type="submit" className="boton-guardar" disabled={guardando}>
                                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </>
                        ) : (
                            <div className="confirmacion-eliminar">
                                <p>¿Seguro que deseas eliminar <strong>{producto.nombre}</strong>?</p>
                                <div className="confirmacion-botones">
                                    <button
                                        type="button"
                                        className="boton-cancelar"
                                        onClick={() => setConfirmandoEliminar(false)}
                                    >
                                        No, cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="boton-eliminar-confirmar"
                                        onClick={alEliminar}
                                        disabled={eliminando}
                                    >
                                        {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}