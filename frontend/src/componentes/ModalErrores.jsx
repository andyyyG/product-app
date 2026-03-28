export default function ModalErrores({ errores, alCerrar }) {
    return (
        <div className="modal-fondo" onClick={alCerrar}>
            <div className="modal modal-errores" onClick={e => e.stopPropagation()}>
                <div className="modal-errores-encabezado">
                    <div>
                        <h2>⚠️Corregir datos</h2>
                        <p className="texto-secundario-info">
                            Corrige los siguientes errores antes de guardar.
                        </p>
                    </div>
                    <button className="boton-cerrar-modal" onClick={alCerrar}>✕</button>
                </div>

                <div className="modal-errores-lista">
                    {errores.map((item, i) => (
                        <div key={i} className="modal-error-fila">
                            <div className="modal-error-fila-titulo">
                                {item.nombre ? `Producto: ${item.nombre}` : `Fila ${item.fila}`}
                            </div>
                            <ul>
                                {item.errores.map((err, j) => (
                                    <li key={j}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                    <button className="boton-guardar" style={{ width: '100%' }} onClick={alCerrar}>
                        Editar
                    </button>
                </div>
            </div>
        </div>
    );
}