import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../../styles/admin.css';

const estadoPedidoClass = {
  ENTREGADO: 'admin-badge admin-badge--success',
  EN_CAMINO: 'admin-badge admin-badge--info',
  EN_PREPARACION: 'admin-badge admin-badge--warning',
  CANCELADO: 'admin-badge admin-badge--danger',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('userName') || 'Administrador';

  const [conteos, setConteos] = useState({ clientes: '—', repartidores: '—', restaurantes: '—', pedidos: '—' });
  const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarConteos = async () => {
      try {
        const [c, r, rest, p] = await Promise.all([
          api.get('/reporte/clientes-registrados'),
          api.get('/reporte/repartidores-registrados'),
          api.get('/reporte/restaurantes-registrados'),
          api.get('/reporte/pedidos-registrados'),
        ]);
        setConteos({
          clientes: (c.data.datos || []).length,
          repartidores: (r.data.datos || []).length,
          restaurantes: (rest.data.datos || []).length,
          pedidos: (p.data.datos || []).length,
        });
        setPedidos((p.data.datos || []).slice(0, 5));
      } catch {
        setError('No se pudo conectar al servidor');
      } finally {
        setCargandoPedidos(false);
      }
    };
    cargarConteos();
  }, []);

 const metricas = [
  { label: 'Clientes',     valor: conteos.clientes,     icono: 'ti-users',          ruta: '/admin/clientes' },
  { label: 'Repartidores', valor: conteos.repartidores, icono: 'ti-motorbike',       ruta: '/admin/repartidores' },
  { label: 'Restaurantes', valor: conteos.restaurantes, icono: 'ti-building-store',  ruta: '/admin/restaurantes' },
  { label: 'Pedidos',      valor: conteos.pedidos,      icono: 'ti-receipt',         ruta: '/admin/pedidos' },
];

  return (
    <div className="admin-page">
      <h1 className="admin-title">Bienvenido, {nombre}</h1>
      <p className="admin-subtitle">Resumen general del sistema CletaEats</p>

      <div className="admin-grid admin-grid--metrics">
        {metricas.map(m => (
          <div
            key={m.label}
            onClick={() => m.ruta && navigate(m.ruta)}
            className={`admin-card admin-count-card ${m.ruta ? 'admin-card--clickable' : ''}`}
            role={m.ruta ? 'button' : undefined}
            tabIndex={m.ruta ? 0 : undefined}
          >
            <div className="admin-metric__icon">
              <i className={`ti ${m.icono}`} />
            </div>
            <div className="admin-count-card__label">{m.label}</div>
            <div className="admin-count-card__value">{m.valor}</div>
          </div>
        ))}
      </div>

      <div className="admin-card admin-card--section">
        <h3 className="admin-card__title">Acceso rápido</h3>
        <div className="admin-grid admin-grid--quick-actions">
          {[
            { label: 'Ver clientes', ruta: '/admin/clientes' },
            { label: 'Ver repartidores', ruta: '/admin/repartidores' },
            { label: 'Ver pedidos', ruta: '/admin/pedidos' },
            { label: 'Ver restaurantes', ruta: '/admin/restaurantes' },
            { label: 'Ver reportes', ruta: '/admin/reportes' },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.ruta)}
              className="admin-action-button"
            >
              {a.label} →
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h3 className="admin-card__title">Últimos pedidos</h3>

        {cargandoPedidos && <p className="admin-loading">Cargando...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!cargandoPedidos && !error && (
          <table className="admin-table">
            <thead>
              <tr>
                {['ID', 'Cliente', 'Restaurante', 'Repartidor', 'Costo envío', 'Estado'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => {
                const badgeClass = estadoPedidoClass[p.estado] || 'admin-badge admin-badge--neutral';
                return (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.cliente}</td>
                    <td>{p.restaurante}</td>
                    <td>{p.repartidor ?? '—'}</td>
                    <td>₡{Number(p.costo_envio).toLocaleString('es-CR')}</td>
                    <td>
                      <span className={badgeClass}>{p.estado}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
