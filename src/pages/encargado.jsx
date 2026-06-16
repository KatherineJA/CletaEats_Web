import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OpcionesComboModal from './OpcionesComboModal';
import api from '../api/api';
import '../styles/admin.css';

const currencyFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

const COMBO_OPTION_TEMPLATES = [
  {
    id: 'sabor-fresco',
    label: 'Sabor de fresco',
    tipo: 'SELECCION_UNICA',
    valores: [
      { descripcion: 'Naranja', costo_adicional: 0 },
      { descripcion: 'Piña', costo_adicional: 0 },
      { descripcion: 'Jamaica', costo_adicional: 0 },
      { descripcion: 'Tamarindo', costo_adicional: 0 },
    ],
  },
  {
    id: 'tamano-combo',
    label: 'Tamaño del combo',
    tipo: 'SELECCION_UNICA',
    valores: [
      { descripcion: 'Personal', costo_adicional: 0 },
      { descripcion: 'Regular', costo_adicional: 0 },
      { descripcion: 'Grande', costo_adicional: 0 },
    ],
  },
  {
    id: 'bebida-incluida',
    label: 'Bebida incluida',
    tipo: 'BOOLEANO',
    valores: [
      { descripcion: 'Sí', costo_adicional: 0 },
      { descripcion: 'No', costo_adicional: 0 },
    ],
  },
  {
    id: 'extra-salsa',
    label: 'Salsa extra',
    tipo: 'BOOLEANO',
    valores: [
      { descripcion: 'Sí', costo_adicional: 0 },
      { descripcion: 'No', costo_adicional: 0 },
    ],
  },
];

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

  // Log de depuración local
  useEffect(() => {
    console.log("DEBUG LOCALSTORAGE - idRestaurante recuperado:", idRestaurante);
  }, [idRestaurante]);

  // ── Estado de combos ──────────────────────────────────────────────────────
  const [combos,         setCombos]         = useState([]);
  const [loadingCombos,  setLoadingCombos]  = useState(true);
  const [comboModal, setComboModal] = useState(null);
  const [editingComboId, setEditingComboId] = useState(null);
  const [comboForm,      setComboForm]      = useState(buildComboForm());
  const [comboImageFile, setComboImageFile] = useState(null);
  const [comboImagePreview, setComboImagePreview] = useState('');
  const [comboOptionTemplateIds, setComboOptionTemplateIds] = useState([]);
  const [feedback,       setFeedback]       = useState({ type: '', message: '' });
  const [submitting,     setSubmitting]     = useState(false);

  // ── Estado del perfil del restaurante ────────────────────────────────────
  const [restaurante, setRestaurante] = useState(null);
  const [editRestForm, setEditRestForm] = useState({ nombre: '', direccion: '', tipo_comida: '' });
  const [restImageFile, setRestImageFile] = useState(null);
  const [restImagePreview, setRestImagePreview] = useState('');
  const [submittingRest, setSubmittingRest] = useState(false);

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

  // ── Cargar datos del restaurante desde el backend ─────────────────────────
  const cargarRestaurante = useCallback(async () => {
    if (!idRestaurante) return;
    try {
      const { data } = await api.get('/restaurantes/menu', {
        params: { id: idRestaurante },
      });
      if (data.exito && data.restaurante) {
        setRestaurante(data.restaurante);
        setEditRestForm({
          nombre: data.restaurante.nombre || '',
          direccion: data.restaurante.direccion || '',
          tipo_comida: data.restaurante.tipo_comida || '',
        });
        setRestImagePreview(data.restaurante.imagen || '');
      }
    } catch (err) {
      console.error('Error cargando restaurante:', err);
    }
  }, [idRestaurante]);

  useEffect(() => {
    cargarCombos();
    cargarRestaurante();
  }, [cargarCombos, cargarRestaurante]);

  // Métricas
  const totalCombos    = combos.length;
  const combosActivos  = combos.filter((c) => c.estado === 'Activo').length;
  const combosPausados = combos.filter((c) => c.estado === 'Pausado').length;
  const comboPromedio  = totalCombos > 0
    ? combos.reduce((sum, c) => sum + Number(c.precio || 0), 0) / totalCombos
    : 0;

  // ── Formulario de combo ───────────────────────────────────────────────────
  const resetComboForm = () => {
    setEditingComboId(null);
    setComboForm(buildComboForm());
    resetMediaAndTemplates();
  };

  const startEditCombo = (combo) => {
    setEditingComboId(combo.id);
    setComboForm(buildComboForm(combo));
    resetMediaAndTemplates();
    if (combo.imagen || combo.imagen_url || combo.ruta_imagen) {
      setComboImagePreview(combo.imagen || combo.imagen_url || combo.ruta_imagen);
    }
    document.getElementById('combo-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showFeedback('info', `Editando "${combo.nombre}". Guardá los cambios para actualizar.`);
  };

  const handleComboFieldChange = (field, value) => {
    setComboForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleComboImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (comboImagePreview && comboImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(comboImagePreview);
    }

    setComboImageFile(file);
    setComboImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const toggleOptionTemplate = (templateId) => {
    setComboOptionTemplateIds((current) => (
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    ));
  };

  const handlePersonalizacionClick = () => {
    if (!editingComboId) {
      showFeedback('info', 'Primero creá el combo. Después podés abrir Opciones de personalización desde su tarjeta para agregar valores normales.');
      return;
    }

    const combo = combos.find((item) => item.id === editingComboId);
    if (combo) {
      setComboModal(combo);
      return;
    }

    showFeedback('danger', 'No se encontró el combo que estás editando. Volvé a cargar la lista.');
  };

  const resetMediaAndTemplates = () => {
    if (comboImagePreview && comboImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(comboImagePreview);
    }

    setComboImageFile(null);
    setComboImagePreview('');
    setComboOptionTemplateIds([]);
  };

  const buildComboPayload = () => {
    const selectedTemplates = COMBO_OPTION_TEMPLATES
      .filter((template) => comboOptionTemplateIds.includes(template.id))
      .map((template) => ({
        nombre: template.label,
        tipo: template.tipo,
        valores: template.valores,
      }));

    const basePayload = {
      nombre: comboForm.nombre.trim(),
      descripcion: comboForm.descripcion.trim(),
      numero: comboForm.numero.trim() === '' ? 0 : Number(comboForm.numero),
      precio: Number(comboForm.precio),
      estado: comboForm.estado,
      opciones_predefinidas: selectedTemplates,
    };

    if (!comboImageFile && selectedTemplates.length === 0) {
      return basePayload;
    }

    const formData = new FormData();
    Object.entries(basePayload).forEach(([key, value]) => {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, String(value));
    });

    if (comboImageFile) {
      formData.append('imagen', comboImageFile);
    }

    return formData;
  };

  // ── Crear / Actualizar combo ──────────────────────────────────────────────
  const handleSubmitCombo = async (event) => {
    event.preventDefault();

    const nombreCombo = comboForm.nombre.trim();

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
      const payload = buildComboPayload();

      if (esEdicion) {
        // ── RUTA B: UPDATE ────────────────────────────────────────────────────
        const requestPayload = payload instanceof FormData
          ? (() => {
              payload.append('id_combo', String(Number(editingComboId)));
              return payload;
            })()
          : {
              id_combo: Number(editingComboId),
              ...payload,
              imagen: null,
            };

        const { data } = await api.post(
          '/combo/actualizar',
          requestPayload,
          requestPayload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
        );

        if (data.exito) {
          showFeedback('success', `"${nombreCombo}" fue actualizado.`);
          resetComboForm();
          cargarCombos();
        } else {
          showFeedback('danger', data.mensaje || 'No se pudo actualizar el combo.');
        }
      } else {
        // ── RUTA A: CREATE ────────────────────────────────────────────────────
        const requestPayload = payload instanceof FormData
          ? (() => {
              payload.append('id_restaurante', String(parsedRestauranteId));
              return payload;
            })()
          : {
              id_restaurante: parsedRestauranteId,
              ...payload,
              imagen: null,
            };

        const { data } = await api.post(
          '/combo',
          requestPayload,
          requestPayload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
        );

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

  // ── Actualizar perfil del restaurante ─────────────────────────────────────
  const handleRestImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (restImagePreview && restImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(restImagePreview);
    }

    setRestImageFile(file);
    setRestImagePreview(file ? URL.createObjectURL(file) : restImagePreview);
  };

  const handleSubmitRestaurante = async (event) => {
    event.preventDefault();

    if (!editRestForm.nombre.trim()) {
      showFeedback('danger', 'El nombre del restaurante es requerido.');
      return;
    }

    setSubmittingRest(true);
    try {
      const formData = new FormData();
      formData.append('id_restaurante', idRestaurante);
      formData.append('nombre', editRestForm.nombre.trim());
      formData.append('direccion', editRestForm.direccion.trim());
      formData.append('tipo_comida', editRestForm.tipo_comida.trim());
      if (restImageFile) formData.append('imagen', restImageFile);

      const { data } = await api.post('/restaurante/actualizar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.exito) {
        showFeedback('success', 'Restaurante actualizado correctamente.');
        setRestImageFile(null);
        cargarRestaurante();
      } else {
        showFeedback('danger', data.mensaje || 'No se pudo actualizar.');
      }
    } catch (err) {
      console.error('Error actualizando restaurante:', err);
      showFeedback('danger', 'Error de conexión al actualizar el restaurante.');
    } finally {
      setSubmittingRest(false);
    }
  };

  return (
    <div className="admin-page encargado-page" style={{ padding: '1rem', minHeight: '100vh', background: 'var(--arena-crema)' }}>
      {/* Hero */}
      <div className="admin-card admin-card--section encargado-hero">
        <div className="encargado-hero__copy">
          <div className="encargado-hero__eyebrow">Panel de encargado</div>
          <h1 className="admin-title">Bienvenido, {nombre}</h1>
          <p className="admin-subtitle">Desde aquí administrás los combos, sus opciones y su imagen opcional.</p>
        </div>
        <div className="encargado-hero__actions">
          <button type="button" className="admin-action-button encargado-hero__action" onClick={() => document.getElementById('combo-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Administrar combos
          </button>
          <button type="button" className="admin-action-button encargado-hero__action" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Perfil del restaurante */}
      <div className="admin-card admin-card--section" style={{ marginBottom: '1rem' }}>
        <div className="encargado-panel__head">
          <div>
            <h2 className="admin-card__title">Mi restaurante</h2>
            <p className="admin-helper">Editá los datos y la imagen de tu local.</p>
          </div>
          {restImagePreview && (
            <img
              src={restImagePreview}
              alt="Imagen del restaurante"
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12 }}
            />
          )}
        </div>

        <form className="admin-form" onSubmit={handleSubmitRestaurante}>
          <div className="admin-form-grid">
            <div>
              <label className="admin-form-label" htmlFor="rest-nombre">Nombre *</label>
              <input
                id="rest-nombre"
                className="admin-input"
                value={editRestForm.nombre}
                onChange={(e) => setEditRestForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label className="admin-form-label" htmlFor="rest-tipo">Tipo de comida</label>
              <input
                id="rest-tipo"
                className="admin-input"
                value={editRestForm.tipo_comida}
                onChange={(e) => setEditRestForm((p) => ({ ...p, tipo_comida: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="admin-form-label" htmlFor="rest-direccion">Dirección</label>
              <input
                id="rest-direccion"
                className="admin-input"
                value={editRestForm.direccion}
                onChange={(e) => setEditRestForm((p) => ({ ...p, direccion: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="admin-form-label" htmlFor="rest-imagen">Imagen del restaurante</label>
              <input
                id="rest-imagen"
                className="admin-input"
                type="file"
                accept="image/*"
                onChange={handleRestImageChange}
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="admin-submit-button" disabled={submittingRest}>
              {submittingRest ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
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

      {/* Feedback global */}
      {feedback.message && (
        <div className={`admin-alert admin-alert--${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Layout central */}
      <div className="encargado-layout">
        {/* Panel formulario */}
        <div id="combo-form-panel" className="admin-card admin-card--section encargado-panel">
          <div className="encargado-panel__head">
            <div>
              <h2 className="admin-card__title">{editingComboId ? 'Editar combo' : 'Crear combo'}</h2>
              <p className="admin-helper">Las opciones pre cargadas y la imagen se agregan aquí si querés; ambas siguen siendo editables después.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', minWidth: 220 }}>
              <button type="button" className="admin-tab" onClick={handlePersonalizacionClick}>
                Opciones de personalización
              </button>
              {editingComboId && (
                <button type="button" className="admin-tab" onClick={resetComboForm}>
                  Cancelar edición
                </button>
              )}
            </div>
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

            <div className="encargado-form-extras">
              <div className="admin-form-section">
                <div className="admin-form-section__head">
                  <h3 className="modal-section__title" style={{ marginBottom: 6 }}>Imagen del combo</h3>
                  <p className="admin-helper">La imagen es opcional. Si la subís ahora, se guardará junto al combo; si no, podés agregarla después.</p>
                </div>
                <input
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  onChange={handleComboImageChange}
                />
                {comboImagePreview && (
                  <div className="encargado-image-preview">
                    <img src={comboImagePreview} alt="Vista previa del combo" />
                  </div>
                )}
              </div>

              <div className="admin-form-section">
                <div className="admin-form-section__head">
                  <h3 className="modal-section__title" style={{ marginBottom: 6 }}>Opciones pre cargadas</h3>
                  <p className="admin-helper">Elegí cuáles querés agregar al crear el combo. Después podrás ajustarlas en Opciones.</p>
                </div>
                <div className="encargado-template-grid">
                  {COMBO_OPTION_TEMPLATES.map((template) => {
                    const selected = comboOptionTemplateIds.includes(template.id);

                    return (
                      <button
                        key={template.id}
                        type="button"
                        className={`encargado-template-card ${selected ? 'encargado-template-card--active' : ''}`}
                        onClick={() => toggleOptionTemplate(template.id)}
                      >
                        <span className="encargado-template-card__title">{template.label}</span>
                        <span className="encargado-template-card__meta">{template.valores.map((valor) => valor.descripcion).join(' · ')}</span>
                        <span className="encargado-template-card__action">{selected ? 'Agregada' : 'Agregar al combo'}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="encargado-template-summary">
                  {comboOptionTemplateIds.length > 0
                    ? `${comboOptionTemplateIds.length} opción(es) seleccionada(s) para este combo.`
                    : 'Todavía no seleccionaste opciones pre cargadas.'}
                </div>
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
                {combo.imagen || combo.imagen_url || combo.ruta_imagen ? (
                  <div className="encargado-combo-card__image-wrap">
                    <img
                      className="encargado-combo-card__image"
                      src={combo.imagen || combo.imagen_url || combo.ruta_imagen}
                      alt={combo.nombre}
                    />
                  </div>
                ) : null}
                {combo.descripcion && <p className="admin-helper">{combo.descripcion}</p>}
                <div className="admin-form-actions encargado-combo-card__actions">
                  <button type="button" className="admin-tab" onClick={() => setComboModal(combo)}>Opciones</button>
                  <button type="button" className="admin-tab" onClick={() => startEditCombo(combo)}>Modificar</button>
                  <button type="button" className="admin-tab encargado-danger-button" onClick={() => deleteCombo(combo)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {comboModal && (
        <OpcionesComboModal
          combo={comboModal}
          onClose={() => setComboModal(null)}
        />
      )}
    </div>
  );
}