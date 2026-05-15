import { useState, useEffect } from 'react';
import api from '../../api/api';
import '../../styles/admin.css';

const badgeEstadoClass = {
  DISPONIBLE: 'admin-badge admin-badge--success',
  OCUPADO: 'admin-badge admin-badge--warning',
  INACTIVO: 'admin-badge admin-badge--danger',
};

export default function Repartidores() {
  const [datos, setDatos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/reporte/repartidores-registrados')
      .then(r => setDatos(r.data.datos || []))
      .catch(() => setError('No se pudo conectar al servidor'))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = datos.filter(r =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.cedula.includes(busqueda)
  );

  return (
    <div className="admin-page">
      <h1 className="admin-title">Repartidores</h1>
      <p className="admin-subtitle">Gestión de repartidores registrados</p>

      <input
        type="text"
        placeholder="Buscar por nombre o cédula..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="admin-input"
      />

      <div className="admin-card admin-card--section admin-card--spaced">
        {cargando && <p className="admin-loading">Cargando...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!cargando && !error && (
          <table className="admin-table">
            <thead>
              <tr>
                {['ID', 'Cédula', 'Nombre', 'Correo', 'Teléfono', 'Estado', 'Km diarios'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan={7} className="admin-empty">Sin resultados</td></tr>
                : filtrados.map(r => {
                  const badgeClass = badgeEstadoClass[r.estado] || 'admin-badge admin-badge--neutral';
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.cedula}</td>
                      <td>{r.nombre}</td>
                      <td>{r.correo}</td>
                      <td>{r.telefono}</td>
                      <td><span className={badgeClass}>{r.estado}</span></td>
                      <td>{r.kilometros_diarios} km</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
