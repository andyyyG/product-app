import { useState } from 'react';
import { cargarExcel } from '../api/productos';
import VistaPrevia from './VistaPrevia';

export default function CargaExcel({ alCargarExito }) {
    const [archivo, setArchivo] = useState(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [errores, setErrores] = useState([]);
    const [erroresBackend, setErroresBackend] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [mostrarPrevia, setMostrarPrevia] = useState(false);

    function validarYMostrarPrevia(archivoSeleccionado) {
        if (!archivoSeleccionado || cargando) return;
        const esExcel = archivoSeleccionado.name.endsWith('.xlsx') ||
                        archivoSeleccionado.name.endsWith('.xls');
        if (!esExcel) {
            setErrores([{ fila: '-', errores: ['El archivo debe ser un Excel (.xlsx o .xls)'] }]);
            return;
        }
        setErrores([]);
        setErroresBackend([]);
        setMensaje('');
        setArchivo(archivoSeleccionado);
        setMostrarPrevia(true);
    }

    async function confirmarCarga(archivoFinal, decisiones = {}) {
        setCargando(true);
        setErroresBackend([]);
        setErrores([]);
        setMensaje('');

        try {
            const respuesta = await cargarExcel(archivoFinal, decisiones);
            setMensaje(respuesta.mensaje);
            setMostrarPrevia(false);
            setArchivo(null);
            alCargarExito();
        } catch (error) {
            if (error.response?.data?.errores) {
                // Error de validación del backend: quedamos en preview
                // y mostramos el modal de errores con los datos del backend
                setErroresBackend(error.response.data.errores);
            } else {
                // Error genérico: cerramos preview y mostramos abajo
                setErrores([{
                    fila: '-',
                    errores: [error.response?.data?.mensaje || 'Error desconocido']
                }]);
                setMostrarPrevia(false);
            }
        } finally {
            setCargando(false);
        }
    }

    function cancelarPrevia() {
        setArchivo(null);
        setMostrarPrevia(false);
        setErroresBackend([]);
    }

    return (
        <div className="carga-excel">
            {!mostrarPrevia && (
                <div
                    className={`zona-drop ${arrastrando ? 'arrastrando' : ''} ${cargando ? 'deshabilitada' : ''}`}
                    onDragOver={(e) => { if (cargando) return; e.preventDefault(); setArrastrando(true); }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => { e.preventDefault(); setArrastrando(false); validarYMostrarPrevia(e.dataTransfer.files[0]); }}
                >
                    <span className="icono-subir">📂</span>
                    <p>Arrastra tu archivo Excel aquí</p>
                    <p className="texto-secundario">o</p>
                    <label className="boton-seleccionar">
                        Seleccionar archivo
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => validarYMostrarPrevia(e.target.files[0])}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
            )}

            {mostrarPrevia && (
                <VistaPrevia
                    archivo={archivo}
                    alConfirmar={confirmarCarga}
                    alCancelar={cancelarPrevia}
                    cargando={cargando}
                    erroresBackend={erroresBackend}
                    alLimpiarErroresBackend={() => setErroresBackend([])}
                />
            )}

            {mensaje && <p className="mensaje-exito">✅ {mensaje}</p>}

            {errores.length > 0 && (
                <div className="contenedor-errores">
                    <h3>❌ Error</h3>
                    {errores.map((e, i) => (
                        <div key={i} className="error-fila">
                            <strong>Fila {e.fila}:</strong>
                            <ul>{e.errores.map((err, j) => <li key={j}>{err}</li>)}</ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}