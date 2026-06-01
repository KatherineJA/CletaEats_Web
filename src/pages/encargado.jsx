import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import '../styles/admin.css';

const currencyFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

const buildComboForm = (combo = null) => ({
  nombre: combo?.nombre ?? '',
  descripcion: combo?.descripcion ?? '',
  precio: combo?.precio != null ? String(combo.precio) : '',
  numero: combo?.numero != null ? String(combo.numero) : '',
  estado: combo?.estado ?? 'Activo',
});

export default function EncargadoHome() {
  const navigate = useNavigate();

  // ── Datos del usuario desde localStorage ──────────────────────────────────
  const nombre         = localStorage.getItem('userName')          || 'Encargado';
  const idRestaurante  = localStorage.getItem('restaurantId') || localStorage.getItem('id_restaurante') || null;
  const restaurantName = localStorage.getItem('restaurantName')    || 'Restaurante asignado';
  const restaurantAddr = localStorage.getItem('restaurantAddress') || 'Dirección por sincronizar';

  // Log de depuración local
  useEffect(() => {
    console.log("DEBUG LOCALSTORAGE - idRestaurante recuperado:", idRestaurante);
  }, [idRestaurante]);

  // ── Estado principal ──────────────────────────────────────────────────────
  const [combos,         setCombos]         = useState([]);
  const [loadingCombos,  setLoadingCombos]  = useState(true);
  const [activeSection,  setActiveSection]  = useState('combos');
  const [editingComboId, setEditingComboId] = useState(null);
  const [comboForm,      setComboForm]      = useState(buildComboForm());
  const [feedback,       setFeedback]       = useState({ type: '', message: '' });
  const [submitting,     setSubmitting]     = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  // ── Cargar combos desde el backend ────────────────────────────────────────
  const cargarCombos = useCallback(async () => {
    if (!idRestaurante) {
      showFeedback('danger', 'No se encontró el ID del restaurante. Volvé a iniciar sesión.');
      setLoadingCombos(false);
      return;
    }

    setLoadingCombos(true);
    try {
      const { data } = await api.get('/combos', {
        params: { id_restaurante: idRestaurante },
      });

      if (data.exito) {
        setCombos(data.combos || []);
      } else {
        showFeedback('danger', data.mensaje || 'No se pudieron cargar los combos.');
      }
    } catch (err) {
      console.error('Error cargando combos:', err);
      showFeedback('danger', 'Error de conexión al cargar los combos.');
    } finally {
      setLoadingCombos(false);
    }
  }, [idRestaurante]);

  useEffect(() => {
    cargarCombos();
  }, [cargarCombos]);

  // Métricas
  const totalCombos    = combos.length;
  const combosActivos  = combos.filter((c) => c.estado === 'Activo').length;
  const combosPausados = combos.filter((c) => c.estado === 'Pausado').length;
  const comboPromedio  = totalCombos > 0
    ? combos.reduce((sum, c) => sum + Number(c.precio || 0), 0) / totalCombos
    : 0;

  // ── Formulario ────────────────────────────────────────────────────────────
  const resetComboForm = () => {
    setEditingComboId(null);
    setComboForm(buildComboForm());
  };

  const startEditCombo = (combo) => {
    setEditingComboId(combo.id);
    setComboForm(buildComboForm(combo));
    setActiveSection('combos');
    showFeedback('info', `Editando "${combo.nombre}". Guardá los cambios para actualizar.`);
  };

  const handleComboFieldChange = (field, value) => {
    setComboForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Crear / Actualizar combo ──────────────────────────────────────────────
  const handleSubmitCombo = async (event) => {
    event.preventDefault();

    const nombreCombo = comboForm.nombre.trim();
    const descripcion = comboForm.descripcion.trim();

    if (!nombreCombo || !comboForm.precio.trim()) {
      showFeedback('danger', 'Completá al menos el nombre y el precio del combo.');
      return;
    }

    const parsedRestauranteId = Number(idRestaurante);
    if (!idRestaurante || Number.isNaN(parsedRestauranteId) || parsedRestauranteId <= 0) {
      showFeedback('danger', 'Error: ID de restaurante no válido. Volvé a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    try {
      const esEdicion = editingComboId !== null && 
                        editingComboId !== undefined && 
                        String(editingComboId).trim() !== '' && 
                        String(editingComboId) !== 'null';

      if (esEdicion) {
        // ── RUTA B: UPDATE ────────────────────────────────────────────────────
        const { data } = await api.post('/combo/actualizar', {
          id_combo:    Number(editingComboId),
          nombre:      nombreCombo,
          descripcion: descripcion,
          numero:      comboForm.numero.trim() === '' ? 0 : Number(comboForm.numero),
          precio:      Number(comboForm.precio),
          imagen:      null
        });

        if (data.exito) {
          showFeedback('success', `"${nombreCombo}" fue actualizado.`);
          resetComboForm();
          cargarCombos();
        } else {
          showFeedback('danger', data.mensaje || 'No se pudo actualizar el combo.');
        }
      } else {
        // ── RUTA A: CREATE ────────────────────────────────────────────────────
        // Enviamos los tipos numéricos nativos directos y limpios para saltar las validaciones básicas de Python
        const payloadCrear = {
          id_restaurante: parsedRestauranteId,
          nombre:         nombreCombo,
          descripcion:    descripcion,
          precio:         Number(comboForm.precio),
          numero:         comboForm.numero.trim() === '' ? 0 : Number(comboForm.numero),
          imagen:         null 
        };

        const { data } = await api.post('/combo', payloadCrear);

        if (data.exito) {
          showFeedback('success', `"${nombreCombo}" fue creado correctamente.`);
          resetComboForm();
          cargarCombos();
        } else {
          showFeedback('danger', data.mensaje || 'No se pudo crear el combo.');
        }
      }
    } catch (err) {
      console.error('Error guardando combo:', err);
      showFeedback('danger', 'Error de conexión al guardar el combo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Eliminar combo ────────────────────────────────────────────────────────
  const deleteCombo = async (combo) => {
    const confirmed = window.confirm(`¿Eliminar el combo "${combo.nombre}"?`);
    if (!confirmed) return;

    try {
      const { data } = await api.post('/combo/eliminar', { id_combo: combo.id });

      if (data.exito) {
        showFeedback('success', `"${combo.nombre}" fue eliminado.`);
        if (editingComboId === combo.id) resetComboForm();
        cargarCombos();
      } else {
        showFeedback('danger', data.mensaje || 'No se pudo eliminar el combo.');
      }
    } catch (err) {
      console.error('Error eliminando combo:', err);
      showFeedback('danger', 'Error de conexión al eliminar el combo.');
    }
  };

  return (
    <div className="admin-page encargado-page" style={{ padding: '1rem', minHeight: '100vh', background: 'var(--arena-crema)' }}>
      {/* Hero */}
      <div className="admin-card admin-card--section encargado-hero">
        <div className="encargado-hero__copy">
          <div className="encargado-hero__eyebrow">Panel de encargado</div>
          <h1 className="admin-title">Bienvenido, {nombre}</h1>
          <p className="admin-subtitle">Desde aquí administrás el restaurante: creá, modificá y eliminá combos.</p>
          <div className="encargado-hero__meta">
            <span className="admin-badge admin-badge--info">{restaurantName}</span>
            <span className="admin-badge admin-badge--neutral">{restaurantAddr}</span>
            <span className="admin-badge admin-badge--success">{combosActivos} combos activos</span>
          </div>
        </div>
        <div className="encargado-hero__actions">
          <button type="button" className="admin-action-button encargado-hero__action" onClick={() => setActiveSection('combos')}>
            Administrar combos
          </button>
          <button type="button" className="admin-action-button encargado-hero__action" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="admin-grid admin-grid--metrics">
        {[
          { label: 'Combos registrados', value: totalCombos },
          { label: 'Combos activos',     value: combosActivos },
          { label: 'Combos pausados',    value: combosPausados },
          { label: 'Precio promedio',    value: currencyFormatter.format(comboPromedio) },
        ].map(({ label, value }) => (
          <div key={label} className="admin-card admin-count-card">
            <div className="admin-count-card__label">{label}</div>
            <div className="admin-count-card__value">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin-tabs admin-tabs--split encargado-tabs">
        {['combos', 'resumen'].map((section) => (
          <button
            key={section}
            type="button"
            className={`admin-tab-button ${activeSection === section ? 'admin-tab-button--active' : ''}`}
            onClick={() => setActiveSection(section)}
          >
            <span>{section === 'combos' ? 'Combos' : 'Resumen operativo'}</span>
          </button>
        ))}
      </div>

      {/* Feedback global */}
      {feedback.message && (
        <div className={`admin-alert admin-alert--${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Layout central */}
      <div className="encargado-layout">
        {/* Panel resumen */}
        <div className="admin-card admin-card--section encargado-panel">
          <div className="encargado-panel__head">
            <div>
              <h2 className="admin-card__title">Resumen del restaurante</h2>
            </div>
          </div>
          <div className="encargado-snapshot">
            <div className="encargado-snapshot__item">
              <span className="admin-helper">Prioridad actual</span>
              <strong>Combos y promociones</strong>
            </div>
            <div className="encargado-snapshot__item">
              <span className="admin-helper">Estado API</span>
              <strong>Conectado listo</strong>
            </div>
          </div>
        </div>

        {/* Panel formulario */}
        <div className="admin-card admin-card--section encargado-panel">
          <div className="encargado-panel__head">
            <div>
              <h2 className="admin-card__title">{editingComboId ? 'Editar combo' : 'Crear combo'}</h2>
            </div>
            {editingComboId && (
              <button type="button" className="admin-tab" onClick={resetComboForm}>
                Cancelar edición
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={handleSubmitCombo}>
            <div className="admin-form-grid">
              <div>
                <label className="admin-form-label" htmlFor="combo-nombre">Nombre del combo</label>
                <input
                  id="combo-nombre"
                  className="admin-input"
                  value={comboForm.nombre}
                  onChange={(e) => handleComboFieldChange('nombre', e.target.value)}
                  placeholder="Ej. Combo Familiar Cleta"
                />
              </div>
              <div>
                <label className="admin-form-label" htmlFor="combo-estado">Estado</label>
                <select
                  id="combo-estado"
                  className="admin-input"
                  value={comboForm.estado}
                  onChange={(e) => handleComboFieldChange('estado', e.target.value)}
                >
                  <option value="Activo">Activo</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Agotado">Agotado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="admin-form-label" htmlFor="combo-descripcion">Descripción</label>
              <textarea
                id="combo-descripcion"
                className="admin-input admin-textarea"
                rows="3"
                value={comboForm.descripcion}
                onChange={(e) => handleComboFieldChange('descripcion', e.target.value)}
                placeholder="Describe el combo."
              />
            </div>

            <div className="admin-form-grid">
              <div>
                <label className="admin-form-label" htmlFor="combo-precio">Precio (₡)</label>
                <input
                  id="combo-precio"
                  className="admin-input"
                  type="number"
                  min="0"
                  value={comboForm.precio}
                  onChange={(e) => handleComboFieldChange('precio', e.target.value)}
                  placeholder="Ej. 14900"
                />
              </div>
              <div>
                <label className="admin-form-label" htmlFor="combo-numero">Número de combo</label>
                <input
                  id="combo-numero"
                  className="admin-input"
                  type="number"
                  min="0"
                  value={comboForm.numero}
                  onChange={(e) => handleComboFieldChange('numero', e.target.value)}
                  placeholder="Ej. 1"
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="button" className="admin-tab" onClick={resetComboForm}>Limpiar</button>
              <button type="submit" className="admin-submit-button" disabled={submitting}>
                {submitting ? 'Guardando…' : editingComboId ? 'Actualizar combo' : 'Crear combo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabla de combos */}
      <div className="admin-card admin-card--section">
        <div className="encargado-panel__head">
          <div>
            <h2 className="admin-card__title">Combos del restaurante</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="admin-badge admin-badge--neutral">{combos.length} registros</span>
            <button type="button" className="admin-tab" onClick={cargarCombos} disabled={loadingCombos}>
              {loadingCombos ? 'Cargando…' : '↺ Actualizar'}
            </button>
          </div>
        </div>

        {loadingCombos ? (
          <div className="encargado-empty">Cargando combos desde el servidor…</div>
        ) : combos.length === 0 ? (
          <div className="encargado-empty">Aún no hay combos creados para este restaurante.</div>
        ) : (
          <div className="encargado-combo-grid">
            {combos.map((combo) => (
              <article key={combo.id} className="admin-card encargado-combo-card">
                <div className="encargado-combo-card__head">
                  <div>
                    <h3 className="admin-card__title" style={{ marginBottom: 4 }}>{combo.nombre}</h3>
                    <span className={`admin-badge admin-badge--${combo.estado === 'Activo' ? 'success' : 'warning'}`}>{combo.estado}</span>
                  </div>
                  <strong className="encargado-combo-card__price">
                    {currencyFormatter.format(Number(combo.precio || 0))}
                  </strong>
                </div>
                {combo.descripcion && <p className="admin-helper">{combo.descripcion}</p>}
                <div className="admin-form-actions encargado-combo-card__actions">
                  <button type="button" className="admin-tab" onClick={() => startEditCombo(combo)}>Modificar</button>
                  <button type="button" className="admin-tab encargado-danger-button" onClick={() => deleteCombo(combo)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}