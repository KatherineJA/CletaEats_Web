import { useState, useEffect } from 'react';
import api from '../../api/api';
import '../../styles/admin.css';

export default function Clientes() {
  const [activos, setActivos] = useState([]);
  const [suspendidos, setSuspendidos] = useState([]);
  const [tab, setTab] = useState('activos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [a, s] = await Promise.all([
          api.get('/reporte/clientes-activos'),
          api.get('/reporte/clientes-suspendidos')
        ]);
        setActivos(a.data.datos || []);
        setSuspendidos(s.data.datos || []);
      } catch (e) {
        setError('No se pudo conectar al servidor');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const datos = tab === 'activos' ? activos : suspendidos;
  const filtrados = datos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.cedula.includes(busqueda)
  );

  return (
    <div className="admin-page">
      <h1 className="admin-title">Clientes</h1>
      <p className="admin-subtitle">Gestión de clientes registrados</p>

      <input
        type="text"
        placeholder="Buscar por nombre o cédula..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="admin-input"
      />

      <div className="admin-card admin-card--section admin-card--spaced">
        <div className="admin-tabs">
          {['activos', 'suspendidos'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`admin-tab ${tab === t ? 'admin-tab--active' : ''}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {cargando && <p className="admin-loading">Cargando...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!cargando && !error && (
          <table className="admin-table">
            <thead>
              <tr>
                {['ID', 'Cédula', 'Nombre'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan={3} className="admin-empty">Sin resultados</td></tr>
                : filtrados.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.cedula}</td>
                    <td>{c.nombre}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
