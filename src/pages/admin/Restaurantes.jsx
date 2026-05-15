import { useEffect, useState } from 'react';
import api from '../../api/api';
import '../../styles/admin.css';

const ReporteCard = ({ titulo, children, cargando, error }) => (
  <div className="admin-card admin-card--section">
    <h3 className="admin-card__title">{titulo}</h3>
    {cargando && <p className="admin-loading">Cargando...</p>}
    {error && <p className="admin-error">{error}</p>}
    {!cargando && !error && children}
  </div>
);

const Tabla = ({ cols, filas, sinDatos = 'Sin datos' }) => (
  <table className="admin-table">
    <thead>
      <tr>
        {cols.map(h => (
          <th key={h}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {filas.length === 0
        ? <tr><td colSpan={cols.length} className="admin-empty">{sinDatos}</td></tr>
        : filas
      }
    </tbody>
  </table>
);

const Fila = ({ celdas }) => (
  <tr>
    {celdas.map((c, i) => (
      <td key={i}>{c}</td>
    ))}
  </tr>
);

const obtenerMonto = valor => {
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '' && !Number.isNaN(Number(valor))) return Number(valor);

  if (valor && typeof valor === 'object') {
    const claves = ['total', 'monto_total', 'monto', 'valor', 'amount', 'total_monto', 'total_subtotales', 'total_envios'];
    for (const clave of claves) {
      const numero = Number(valor[clave]);
      if (!Number.isNaN(numero)) return numero;
    }
  }

  return NaN;
};

const fmt = valor => {
  const monto = obtenerMonto(valor);
  if (Number.isNaN(monto)) return '—';
  return `CRC ${monto.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
};

export default function Restaurantes() {
  const [topRestaurante, setTopRestaurante] = useState(null);
  const [ganancias, setGanancias] = useState([]);
  const [montoTotal, setMontoTotal] = useState(null);
  const [horaPico, setHoraPico] = useState(null);
  const [pedidosCliente, setPedidosCliente] = useState([]);
  const [repartidoresMalos, setRepartidoresMalos] = useState([]);
  const [estados, setEstados] = useState({});

  const cargar = async (key, endpoint, setter) => {
    setEstados(e => ({ ...e, [key]: { cargando: true, error: null } }));
    try {
      const r = await api.get(endpoint);
      setter(r.data.datos);
      setEstados(e => ({ ...e, [key]: { cargando: false, error: null } }));
    } catch {
      setEstados(e => ({ ...e, [key]: { cargando: false, error: 'Error al cargar' } }));
    }
  };

  useEffect(() => {
    cargar('topRest', '/reporte/restaurantes-con-mas-pedidos', setTopRestaurante);
    cargar('ganancias', '/reporte/ganancias-por-restaurante', setGanancias);
    cargar('montoTotal', '/reporte/monto-global-total', setMontoTotal);
    cargar('horaPico', '/reporte/hora-pico', setHoraPico);
    cargar('pedidosCliente', '/reporte/pedidos-por-cliente', setPedidosCliente);
    cargar('repartidoresMalos', '/reporte/repartidores-malos', setRepartidoresMalos);
  }, []);

  const st = key => estados[key] || { cargando: true, error: null };

  return (
    <div className="admin-page">
      <h1 className="admin-title">Reportes</h1>
      <p className="admin-subtitle">Estadísticas y análisis del sistema</p>

      <div className="admin-grid admin-grid--metrics">
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Total en subtotales</p>
          <p className="admin-count-card__value admin-count-card__value--large">
            {st('montoTotal').cargando ? '...' : fmt(montoTotal?.total_subtotales)}
          </p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Total en envíos</p>
          <p className="admin-count-card__value admin-count-card__value--large">
            {st('montoTotal').cargando ? '...' : fmt(montoTotal?.total_envios)}
          </p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Restaurante con más pedidos</p>
          <p className="admin-count-card__value admin-metric__value--small">
            {st('topRest').cargando ? '...' : topRestaurante
              ? `${topRestaurante.nombre} (${topRestaurante.total_pedidos})`
              : '—'}
          </p>
        </div>
        <div className="admin-card admin-count-card">
          <p className="admin-count-card__label">Hora pico</p>
          <p className="admin-count-card__value admin-count-card__value--large">
            {st('horaPico').cargando ? '...'
              : horaPico ? `${horaPico.hora}:00 (${horaPico.total_pedidos} pedidos)`
              : '—'}
          </p>
        </div>
      </div>

      <ReporteCard titulo="Ganancias por restaurante" {...st('ganancias')}>
        <Tabla
          cols={['Restaurante', 'Total subtotales', 'Total envíos']}
          filas={(ganancias || []).map(r => (
            <Fila key={r.id} celdas={[
              <span className="admin-text-strong">{r.nombre}</span>,
              fmt(r.total_subtotales),
              fmt(r.total_envios)
            ]} />
          ))}
        />
      </ReporteCard>

      <ReporteCard titulo="Pedidos por cliente" {...st('pedidosCliente')}>
        <Tabla
          cols={['Cédula', 'Cliente', 'Total pedidos']}
          filas={(pedidosCliente || []).map(c => (
            <Fila key={c.id} celdas={[
              c.cedula,
              c.nombre,
              <span className="admin-text-strong">{c.total_pedidos}</span>
            ]} />
          ))}
        />
      </ReporteCard>

      <ReporteCard titulo="Calificaciones malas por repartidor" {...st('repartidoresMalos')}>
        <Tabla
          cols={['Repartidor', 'Cédula', 'Total malos', 'Opiniones']}
          sinDatos="Sin calificaciones malas registradas"
          filas={(repartidoresMalos || []).map(r => (
            <Fila key={r.id} celdas={[
              r.nombre,
              r.cedula,
              <span className={r.total_malos > 0 ? 'admin-badge admin-badge--danger' : 'admin-badge admin-badge--success'}>{r.total_malos}</span>,
              r.opiniones ?? 'Sin opiniones'
            ]} />
          ))}
        />
      </ReporteCard>
    </div>
  );
}