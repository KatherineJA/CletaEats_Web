import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import '../../styles/admin.css';

const estadoBadgeClass = {
  ENTREGADO: 'admin-badge admin-badge--success',
  EN_CAMINO: 'admin-badge admin-badge--info',
  EN_PREPARACION: 'admin-badge admin-badge--warning',
  CANCELADO: 'admin-badge admin-badge--danger',
};

const normalizarTexto = valor => (valor ?? '').toString().trim().toLowerCase();

const formatearMoneda = valor => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '—';
  return `₡${numero.toLocaleString('es-CR')}`;
};

const formatearFecha = valor => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const respuesta = await api.get('/reporte/pedidos-registrados');
        setPedidos(respuesta.data.datos || []);
      } catch {
        setError('No se pudo conectar al servidor');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const resumen = useMemo(() => {
    const total = pedidos.length;
    const porEstado = pedidos.reduce((acc, pedido) => {
      const clave = (pedido.estado || 'SIN_ESTADO').toUpperCase();
      acc[clave] = (acc[clave] || 0) + 1;
      return acc;
    }, {});
    const envios = pedidos.reduce((acumulado, pedido) => acumulado + Number(pedido.costo_envio || 0), 0);
    const promedioEnvio = total > 0 ? envios / total : 0;

    return {
      total,
      entregados: porEstado.ENTREGADO || 0,
      enProceso: (porEstado.EN_CAMINO || 0) + (porEstado.EN_PREPARACION || 0),
      cancelados: porEstado.CANCELADO || 0,
      promedioEnvio,
    };
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return pedidos.filter(pedido => {
      const estadoPedido = (pedido.estado || 'SIN_ESTADO').toUpperCase();
      const coincideEstado = estado === 'TODOS' || estadoPedido === estado;

      const coincideTexto = !texto || [
        pedido.id,
        pedido.cliente,
        pedido.restaurante,
        pedido.repartidor,
        pedido.estado,
        pedido.fecha,
        pedido.hora_creacion,
        pedido.hora_entrega,
        pedido.created_at,
        pedido.fecha_pedido,
      ].some(campo => normalizarTexto(campo).includes(texto));

      return coincideEstado && coincideTexto;
    });
  }, [busqueda, estado, pedidos]);

  const tabs = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'EN_PREPARACION', label: 'En preparación' },
    { key: 'EN_CAMINO', label: 'En camino' },
    { key: 'ENTREGADO', label: 'Entregados' },
    { key: 'CANCELADO', label: 'Cancelados' },
  ];

  return (
    <div className="admin-page">
      <h1 className="admin-title">Pedidos</h1>
      <p className="admin-subtitle">Seguimiento y control de pedidos registrados</p>

      <div className="admin-grid admin-grid--metrics">
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Total pedidos</p>
          <p className="admin-count-card__value">{cargando ? '...' : resumen.total}</p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">En proceso</p>
          <p className="admin-count-card__value">{cargando ? '...' : resumen.enProceso}</p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Entregados</p>
          <p className="admin-count-card__value">{cargando ? '...' : resumen.entregados}</p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Envío promedio</p>
          <p className="admin-count-card__value">{cargando ? '...' : formatearMoneda(resumen.promedioEnvio)}</p>
        </div>
      </div>

      <div className="admin-card admin-card--section admin-card--spaced">
        <div className="admin-toolbar">
          <input
            type="text"
            placeholder="Buscar por cliente, restaurante, repartidor o estado..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="admin-input admin-toolbar__search"
          />
        </div>

        <div className="admin-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setEstado(tab.key)}
              className={`admin-tab ${estado === tab.key ? 'admin-tab--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {cargando && <p className="admin-loading">Cargando...</p>}
        {error && <p className="admin-error">{error}</p>}

        {!cargando && !error && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  {['ID', 'Cliente', 'Restaurante', 'Repartidor', 'Fecha', 'Costo envío', 'Estado'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0
                  ? <tr><td colSpan={7} className="admin-empty">Sin resultados</td></tr>
                  : filtrados.map(pedido => {
                    const estadoPedido = (pedido.estado || 'SIN_ESTADO').toUpperCase();
                    const badgeClass = estadoBadgeClass[estadoPedido] || 'admin-badge admin-badge--neutral';

                    return (
                      <tr key={pedido.id}>
                        <td>#{pedido.id}</td>
                        <td>{pedido.cliente ?? '—'}</td>
                        <td>{pedido.restaurante ?? '—'}</td>
                        <td>{pedido.repartidor ?? '—'}</td>
                        <td>{formatearFecha(pedido.fecha ?? pedido.hora_creacion ?? pedido.hora_entrega ?? pedido.created_at ?? pedido.fecha_pedido)}</td>
                        <td>{formatearMoneda(pedido.costo_envio)}</td>
                        <td><span className={badgeClass}>{estadoPedido.replaceAll('_', ' ')}</span></td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card admin-card--section">
        <h3 className="admin-card__title">Resumen por estado</h3>
        <div className="admin-grid admin-grid--quick-actions admin-status-grid">
          {[
            { label: 'En preparación', valor: pedidos.filter(p => (p.estado || '').toUpperCase() === 'EN_PREPARACION').length, clase: 'admin-badge admin-badge--warning' },
            { label: 'En camino', valor: pedidos.filter(p => (p.estado || '').toUpperCase() === 'EN_CAMINO').length, clase: 'admin-badge admin-badge--info' },
            { label: 'Entregados', valor: pedidos.filter(p => (p.estado || '').toUpperCase() === 'ENTREGADO').length, clase: 'admin-badge admin-badge--success' },
            { label: 'Cancelados', valor: pedidos.filter(p => (p.estado || '').toUpperCase() === 'CANCELADO').length, clase: 'admin-badge admin-badge--danger' },
          ].map(item => (
            <div key={item.label} className="admin-status-chip">
              <span className={item.clase}>{item.label}</span>
              <strong>{item.valor}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}