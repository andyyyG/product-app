import { useState, useEffect, useMemo } from 'react';
import { obtenerProductos } from './api/productos';
import CargaExcel from './componentes/CargaExcel';
import TarjetaProducto from './componentes/TarjetaProducto';
import ModalEdicion from './componentes/ModalEdicion';

export default function App() {
  const [productos, setProductos] = useState([]);
  const [productoEditando, setProductoEditando] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  async function cargarProductos() {
    setCargando(true);
    try {
      const datos = await obtenerProductos();
      setProductos(datos);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  // Filtrado en tiempo real sin llamadas al backend
  const productosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return productos;
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      p.descripcion.toLowerCase().includes(termino) ||
      String(p.precio).includes(termino)
    );
  }, [busqueda, productos]);

  function alGuardarEdicion(productoActualizado) {
    if (productoActualizado === null) {
      // El producto fue eliminado
      setProductos(productos.filter(p => p.id !== productoEditando.id));
    } else {
      setProductos(productos.map(p =>
        p.id === productoActualizado.id ? productoActualizado : p
      ));
    }
    setProductoEditando(null);
  }

  return (
    <div className="app">
      <header className="encabezado">
        <h1>📦 Gestor de Productos</h1>
      </header>

      <main className="contenido">
        <CargaExcel alCargarExito={cargarProductos} />

        {!cargando && productos.length > 0 && (
          <section className="seccion-productos">
            <div className="barra-herramientas">
              <h2>Productos ({productosFiltrados.length} de {productos.length})</h2>
              <div className="contenedor-busqueda">
                <span className="icono-busqueda">🔍</span>
                <input
                  type="text"
                  className="input-busqueda"
                  placeholder="Buscar por nombre, descripción o precio..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button className="boton-limpiar" onClick={() => setBusqueda('')}>✕</button>
                )}
              </div>
            </div>

            {productosFiltrados.length === 0 ? (
              <p className="sin-productos">No se encontraron productos para "{busqueda}"</p>
            ) : (
              <div className="grilla-productos">
                {productosFiltrados.map(producto => (
                  <TarjetaProducto
                    key={producto.id}
                    producto={producto}
                    alEditar={setProductoEditando}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {cargando && <p className="cargando">Cargando productos...</p>}

        {!cargando && productos.length === 0 && (
          <p className="sin-productos">Carga un archivo Excel para ver los productos.</p>
        )}
      </main>

      {productoEditando && (
        <ModalEdicion
          producto={productoEditando}
          alCerrar={() => setProductoEditando(null)}
          alGuardar={alGuardarEdicion}
        />
      )}
    </div>
  );
}