import { useState } from 'react';

export default function TarjetaProducto({ producto, alEditar }) {
    const [estadoImagen, setEstadoImagen] = useState('cargando');

    function esUrlValida(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    const urlValida = esUrlValida(producto.imagen_url);

    return (
        <div className="tarjeta">
            <div className="tarjeta-imagen">
                {!urlValida ? (
                    <div className="imagen-fallback">
                        <span>🔗</span>
                        <p>URL inválida</p>
                    </div>
                ) : estadoImagen === 'error' ? (
                    <div className="imagen-fallback">
                        <span>🖼️</span>
                        <p>Imagen no disponible</p>
                    </div>
                ) : (
                    <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        style={{ display: estadoImagen === 'cargando' ? 'none' : 'block' }}
                        onLoad={() => setEstadoImagen('ok')}
                        onError={() => setEstadoImagen('error')}
                    />
                )}
                {urlValida && estadoImagen === 'cargando' && (
                    <div className="imagen-fallback">
                        <span>⏳</span>
                        <p>Cargando imagen...</p>
                    </div>
                )}
            </div>
            <div className="tarjeta-contenido">
                <h3>{producto.nombre}</h3>
                <p className="precio">${Number(producto.precio).toFixed(2)}</p>
                <p className="descripcion">{producto.descripcion}</p>
                <p className="cantidad">Disponibles: <strong>{producto.cantidad}</strong></p>
            </div>
            <button className="boton-editar" onClick={() => alEditar(producto)}>
                ✏️ Editar
            </button>
        </div>
    );
}