import * as XLSX from 'xlsx';
import { useState } from 'react';
import { verificarConflictos, verificarImagenes } from '../api/productos';
import { validarFilas } from '../utils/validarProductos';
import PantallaConflictos from './PantallaConflictos';
import ModalErrores from './ModalErrores';

const COLUMNAS = [
    { clave: 'nombre',      etiqueta: 'Nombre',      tipo: 'text'   },
    { clave: 'precio',      etiqueta: 'Precio',       tipo: 'number' },
    { clave: 'descripcion', etiqueta: 'Descripción',  tipo: 'text'   },
    { clave: 'cantidad',    etiqueta: 'Cantidad',      tipo: 'number' },
    { clave: 'imagen_url',  etiqueta: 'URL imagen',   tipo: 'text'   },
];

export default function VistaPrevia({
    archivo, alConfirmar, alCancelar, cargando,
    erroresBackend = [], alLimpiarErroresBackend
}) {
    const [filas, setFilas]                   = useState([]);
    const [leido, setLeido]                   = useState(false);
    const [celdaEditando, setCeldaEditando]   = useState(null);
    const [verificando, setVerificando]       = useState(false);
    const [conflictos, setConflictos]         = useState(null);
    const [erroresValidacion, setErroresValidacion] = useState([]);
    // Conjunto de índices de filas con error para marcarlas visualmente
    const [indicesConError, setIndicesConError] = useState(new Set());

    useState(() => {
        if (!archivo) return;
        const lector = new FileReader();
        lector.onload = (e) => {
            const libro = XLSX.read(e.target.result, { type: 'array' });
            const hoja  = libro.Sheets[libro.SheetNames[0]];
            const datos = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
            const filasDatos = datos.slice(1).map(fila => ({
                nombre:      String(fila[0] ?? '').trim(),
                precio:      fila[1] ?? '',
                descripcion: String(fila[2] ?? '').trim(),
                cantidad:    fila[3] ?? '',
                imagen_url:  String(fila[4] ?? '').trim(),
            }));
            setFilas(filasDatos);
            setLeido(true);
        };
        lector.readAsArrayBuffer(archivo);
    }, [archivo]);

    function alCambiarCelda(indiceFila, clave, valor) {
        setFilas(prev => prev.map((fila, i) =>
            i === indiceFila ? { ...fila, [clave]: valor } : fila
        ));
        // Limpiar error de esa fila si el usuario la edita
        if (indicesConError.has(indiceFila)) {
            setIndicesConError(prev => {
                const nuevo = new Set(prev);
                nuevo.delete(indiceFila);
                return nuevo;
            });
        }
    }

    function eliminarFila(indiceFila) {
        setFilas(prev => prev.filter((_, i) => i !== indiceFila));
        setIndicesConError(prev => {
            const nuevo = new Set();
            prev.forEach(idx => { if (idx !== indiceFila) nuevo.add(idx > indiceFila ? idx - 1 : idx); });
            return nuevo;
        });
    }

    function construirArchivoEditado() {
        const libro      = XLSX.utils.book_new();
        const encabezados = COLUMNAS.map(c => c.clave);
        const datos      = [encabezados, ...filas.map(f => encabezados.map(c => f[c] ?? ''))];
        const hoja       = XLSX.utils.aoa_to_sheet(datos);
        XLSX.utils.book_append_sheet(libro, hoja, 'Productos');
        const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
        return new File([buffer], 'productos_editado.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
    }

    async function alPresionarGuardar() {
        if (filas.length === 0) return;

        // Validación de campos (síncrona, instantánea)
        const erroresCampos = validarFilas(filas);

        // Verificación de imágenes en el backend (en paralelo con lo anterior)
        setVerificando(true);
        let erroresImagenes = [];
        try {
            const imagenesAVerificar = filas
                .map((fila, indice) => ({ fila: indice + 2, indice, url: fila.imagen_url }))
                .filter(item => item.url && item.url.trim() !== '');

            const { errores } = await verificarImagenes(imagenesAVerificar);
            // El backend devuelve { fila, errores[] }, añadimos indice
            erroresImagenes = errores.map(e => ({
                ...e,
                indice: e.fila - 2,
            }));
        } catch (error) {
            console.error('Error verificando imágenes:', error);
        } finally {
            setVerificando(false);
        }

        // Unimos todos los errores agrupados por fila
        const mapaErrores = {};
        [...erroresCampos, ...erroresImagenes].forEach(item => {
            if (!mapaErrores[item.fila]) {
                mapaErrores[item.fila] = { fila: item.fila, indice: item.indice, nombre: filas[item.indice]?.nombre || null, errores: [] };
            }
            mapaErrores[item.fila].errores.push(...item.errores);
        });

        const todosLosErrores = Object.values(mapaErrores).sort((a, b) => a.fila - b.fila);

        if (todosLosErrores.length > 0) {
            // Marcamos las filas con error en la tabla
            setIndicesConError(new Set(todosLosErrores.map(e => e.indice)));
            setErroresValidacion(todosLosErrores);
            return;
        }

        // Sin errores: verificar conflictos
        setVerificando(true);
        try {
            const { resultado } = await verificarConflictos(filas);
            const hayConflictosOSumas = resultado.some(
                r => r.tipo === 'conflicto' || r.tipo === 'sumar_cantidad'
            );
            if (hayConflictosOSumas) {
                setConflictos(resultado);
            } else {
                alConfirmar(construirArchivoEditado(), {});
            }
        } catch (error) {
            console.error('Error al verificar conflictos:', error);
            alConfirmar(construirArchivoEditado(), {});
        } finally {
            setVerificando(false);
        }
    }

    function alConfirmarConflictos(decisiones) {
        alConfirmar(construirArchivoEditado(), decisiones);
        setConflictos(null);
    }

    function alCerrarModal() {
        setErroresValidacion([]);
        alLimpiarErroresBackend?.();
    }

    if (!leido) return <p className="cargando">Leyendo archivo...</p>;

    if (conflictos) {
        return (
            <PantallaConflictos
                resultado={conflictos}
                alConfirmar={alConfirmarConflictos}
                alCancelar={() => setConflictos(null)}
            />
        );
    }

    const erroresMostrar = erroresValidacion.length > 0 ? erroresValidacion : erroresBackend;

    return (
        <>
            {erroresMostrar.length > 0 && (
                <ModalErrores
                    errores={erroresMostrar}
                    alCerrar={alCerrarModal}
                />
            )}

            <div className="vista-previa">
                <div className="vista-previa-encabezado">
                    <div>
                        <h3>Vista previa del archivo</h3>
                        <p className="texto-secundario-info">
                            {filas.length} fila(s) — edita o elimina antes de guardar
                            {indicesConError.size > 0 && (
                                <span className="badge-errores-preview">
                                    {indicesConError.size} fila(s) con errores
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="vista-previa-botones">
                        <button className="boton-cancelar" onClick={alCancelar}>Cancelar</button>
                        <button
                            className="boton-guardar"
                            onClick={alPresionarGuardar}
                            disabled={cargando || verificando || filas.length === 0}
                        >
                            {verificando ? 'Verificando...' : cargando ? 'Guardando...' : `Guardar ${filas.length} productos`}
                        </button>
                    </div>
                </div>

                <div className="tabla-contenedor">
                    <table className="tabla-preview">
                        <thead>
                            <tr>
                                <th>#</th>
                                {COLUMNAS.map(col => <th key={col.clave}>{col.etiqueta}</th>)}
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((fila, indiceFila) => {
                                const tieneError = indicesConError.has(indiceFila);
                                return (
                                    <tr
                                        key={indiceFila}
                                        className={tieneError ? 'fila-con-error' : ''}
                                    >
                                        <td className="fila-numero">
                                            {tieneError
                                                ? <span className="icono-error-fila" title="Esta fila tiene errores">!</span>
                                                : indiceFila + 2
                                            }
                                        </td>
                                        {COLUMNAS.map(({ clave, tipo }) => {
                                            const estaEditando =
                                                celdaEditando?.fila === indiceFila &&
                                                celdaEditando?.columna === clave;
                                            return (
                                                <td
                                                    key={clave}
                                                    className={`celda-editable ${estaEditando ? 'editando' : ''}`}
                                                    onClick={() => setCeldaEditando({ fila: indiceFila, columna: clave })}
                                                >
                                                    {estaEditando ? (
                                                        <input
                                                            autoFocus
                                                            type={tipo}
                                                            value={fila[clave] ?? ''}
                                                            onChange={(e) => alCambiarCelda(indiceFila, clave, e.target.value)}
                                                            onBlur={() => setCeldaEditando(null)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === 'Escape') setCeldaEditando(null);
                                                            }}
                                                            className="input-celda"
                                                        />
                                                    ) : (
                                                        <span className={clave === 'imagen_url' ? 'url-preview' : ''}>
                                                            {String(fila[clave] ?? '—')}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td>
                                            <button
                                                className="boton-eliminar-fila"
                                                onClick={() => eliminarFila(indiceFila)}
                                                title="Eliminar esta fila"
                                            >✕</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}