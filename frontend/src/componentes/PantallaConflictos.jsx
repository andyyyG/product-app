import { useState } from 'react';

function TarjetaMini({ producto, etiqueta, tipo }) {
    const [imagenRota, setImagenRota] = useState(false);

    function esUrlValida(url) {
        try { new URL(url); return true; } catch { return false; }
    }

    return (
        <div className={`tarjeta-mini ${tipo}`}>
            <span className={`tarjeta-mini-etiqueta ${tipo}`}>{etiqueta}</span>
            <div className="tarjeta-mini-imagen">
                {!esUrlValida(producto.imagen_url) || imagenRota ? (
                    <div className="imagen-fallback-mini">🖼️</div>
                ) : (
                    <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        onError={() => setImagenRota(true)}
                    />
                )}
            </div>
            <div className="tarjeta-mini-contenido">
                <p className="tarjeta-mini-nombre">{producto.nombre}</p>
                <p className="tarjeta-mini-precio">${Number(producto.precio).toFixed(2)}</p>
                <p className="tarjeta-mini-desc">{producto.descripcion}</p>
                <p className="tarjeta-mini-cantidad">Disponibles: <strong>{producto.cantidad}</strong></p>
            </div>
        </div>
    );
}

export default function PantallaConflictos({ resultado, alConfirmar, alCancelar }) {
    const conflictos    = resultado.filter(r => r.tipo === 'conflicto');
    const sumarCantidad = resultado.filter(r => r.tipo === 'sumar_cantidad');
    const nuevos        = resultado.filter(r => r.tipo === 'nuevo');

    const [decisiones, setDecisiones] = useState(() => {
        const mapa = {};
        conflictos.forEach(c => { mapa[c.entrante.nombre] = 'sumar_cantidad'; });
        sumarCantidad.forEach(c => { mapa[c.entrante.nombre] = 'sumar_cantidad'; });
        return mapa;
    });

    const [nombresNuevos, setNombresNuevos] = useState(() => {
        const mapa = {};
        conflictos.forEach(c => { mapa[c.entrante.nombre] = c.entrante.nombre; });
        return mapa;
    });

    function confirmar() {
        const decisionesFinal = {};
        conflictos.forEach(c => {
            decisionesFinal[c.entrante.nombre] = decisiones[c.entrante.nombre];
        });
        sumarCantidad.forEach(c => {
            decisionesFinal[c.entrante.nombre] = 'sumar_cantidad';
        });
        alConfirmar(decisionesFinal);
    }

    return (
        <div className="vista-previa">
            <div className="vista-previa-encabezado">
                <div>
                    <h3>Resumen de carga</h3>
                    <p className="texto-secundario-info">
                        {nuevos.length} nuevo(s) · {sumarCantidad.length} se sumará unidad(es) a inventario · {conflictos.length} con conflicto(s)
                    </p>
                </div>
                <div className="vista-previa-botones">
                    <button className="boton-cancelar" onClick={alCancelar}>Cancelar</button>
                    <button className="boton-guardar" onClick={confirmar}>Confirmar y guardar</button>
                </div>
            </div>

            <div className="resumen-cuerpo">

                {/* Nuevos */}
                {nuevos.length > 0 && (
                    <div className="seccion-resumen">
                        <h4 className="resumen-titulo verde">✅ Productos nuevos ({nuevos.length})</h4>
                        {nuevos.map(({ entrante }) => (
                            <div key={entrante.nombre} className="resumen-fila">
                                <span>{entrante.nombre}</span>
                                <span className="resumen-detalle">
                                    ${Number(entrante.precio).toFixed(2)} · {entrante.cantidad} unidades
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Suma cantidad sin conflicto */}
                {sumarCantidad.length > 0 && (
                    <div className="seccion-resumen">
                        <h4 className="resumen-titulo gris">
                            ➕ Se agregará unidad(es) ({sumarCantidad.length})
                        </h4>
                        {sumarCantidad.map(({ entrante, existente, esSimilar, porcentajeSimilitud }) => (
                            <div key={entrante.nombre} className="resumen-fila">
                                <span>
                                    {entrante.nombre}
                                    {esSimilar && (
                                        <span className="badge-similar" title={`Similar a "${existente.nombre}"`}>
                                            ~{porcentajeSimilitud}% similar a "{existente.nombre}"
                                        </span>
                                    )}
                                </span>
                                <span className="resumen-detalle">
                                    {existente.cantidad} + {entrante.cantidad} = {Number(existente.cantidad) + Number(entrante.cantidad)} unidades
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Conflictos */}
                {conflictos.length > 0 && (
                    <div className="seccion-resumen">
                        <h4 className="resumen-titulo amarillo">⚠️ Estos productos requieren tu confirmación ({conflictos.length})</h4>

                        {conflictos.map(({ entrante, existente, diferencias, esSimilar, porcentajeSimilitud }) => (
                            <div key={entrante.nombre} className="conflicto-card">
                                <div className="conflicto-nombre">
                                    <strong>{entrante.nombre}</strong>
                                    <span className="badge-conflicto">Productos existentes en catálogo</span>
                                    {esSimilar && (
                                        <span className="badge-similar">
                                            ~{porcentajeSimilitud}% similar a "{existente.nombre}"
                                        </span>
                                    )}
                                </div>

                                {/* Tarjetas comparativas */}
                                <div className="conflicto-tarjetas">
                                    <TarjetaMini
                                        producto={existente}
                                        etiqueta="En catálogo"
                                        tipo="existente"
                                    />
                                    <div className="conflicto-vs">VS</div>
                                    <TarjetaMini
                                        producto={entrante}
                                        etiqueta="En Excel"
                                        tipo="nuevo"
                                    />
                                </div>

                                {/* Diferencias resaltadas */}
                                <div className="diferencias-lista">
                                    {diferencias.precioCambio && (
                                        <span className="diferencia-item">
                                            Precio distinto
                                        </span>
                                    )}
                                    {diferencias.descripcionCambio && (
                                        <span className="diferencia-item">Descripción distinta</span>
                                    )}
                                    {diferencias.imagenCambio && (
                                        <span className="diferencia-item">Imagen distinta</span>
                                    )}
                                </div>

                                {/* Opciones de decisión */}
                                <div className="conflicto-opciones">
                                    <div
                                        className={`opcion-card ${decisiones[entrante.nombre] === 'sumar_cantidad' ? 'seleccionada' : ''}`}
                                        onClick={() => setDecisiones(prev => ({ ...prev, [entrante.nombre]: 'sumar_cantidad' }))}
                                    >
                                        <span className="opcion-titulo">➕ Agregar unidad(es) al producto existente</span>
                                        <span className="opcion-desc">
                                            Mantener "{existente.nombre}" en catálogo y agregar {entrante.cantidad} unidad(es).
                                            Total: {Number(existente.cantidad) + Number(entrante.cantidad)}
                                        </span>
                                    </div>

                                    <div
                                        className={`opcion-card nueva ${decisiones[entrante.nombre]?.accion === 'nuevo_producto' ? 'seleccionada' : ''}`}
                                        onClick={() => setDecisiones(prev => ({
                                            ...prev,
                                            [entrante.nombre]: { accion: 'nuevo_producto', nombreFinal: nombresNuevos[entrante.nombre] }
                                        }))}
                                    >
                                        <span className="opcion-titulo">🆕 Agregar como producto nuevo</span>
                                        <span className="opcion-desc">Nombre en catálogo:</span>
                                        <input
                                            className="input-nombre-nuevo"
                                            type="text"
                                            value={nombresNuevos[entrante.nombre]}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDecisiones(prev => ({
                                                    ...prev,
                                                    [entrante.nombre]: { accion: 'nuevo_producto', nombreFinal: e.target.value }
                                                }));
                                            }}
                                            onChange={(e) => {
                                                setNombresNuevos(prev => ({ ...prev, [entrante.nombre]: e.target.value }));
                                                setDecisiones(prev => ({
                                                    ...prev,
                                                    [entrante.nombre]: { accion: 'nuevo_producto', nombreFinal: e.target.value }
                                                }));
                                            }}
                                            placeholder="Nombre del nuevo producto"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}